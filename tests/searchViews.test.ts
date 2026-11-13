// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, ref, watch } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Slot, uiStubs } from "./helpers/ui";
import Search from "../app/components/map/Search.vue";
import List from "../app/pages/lijst/index.vue";
import IssueSearchTable from "../app/components/IssueSearchTable.vue";
import IssueEditDialog from "../app/components/IssueEditDialog.vue";
import IssueDeleteDialog from "../app/components/IssueDeleteDialog.vue";
import IssueInfoDialog from "../app/components/IssueInfoDialog.vue";
import IssueCommentsDialog from "../app/components/IssueCommentsDialog.vue";
import { useFilter } from "../app/composables/useFilter";
import { parseSearchTerms } from "../app/utils/parseSearchTerms";
import { transformBboxToOpenLayers } from "../app/utils/getIssuesBbox";
vi.mock("vuetify", () => ({ useDisplay: () => ({ mobile }) }));
const mobile = ref(false);
const stubs = {
  ...uiStubs,
  VIcon: defineComponent({
    props: ["icon"],
    template: '<span class="test-icon">{{ icon }}<slot /></span>',
  }),
  VImg: defineComponent({
    name: "VImg",
    props: ["src"],
    template: '<img :src="src">',
  }),
  VListItem: defineComponent({
    props: ["title"],
    template: '<div>{{ title }}<slot name="subtitle" /></div>',
  }),
  VProgressCircular: true,
  VTooltip: Slot,
};
const wrappers: Array<{
  unmount(): void;
}> = [];
beforeEach(() => {
  vueGlobals();
  mobile.value = false;
  vi.useFakeTimers();
  vi.stubGlobal("useTitle", vi.fn());
  vi.stubGlobal("navigateTo", vi.fn());
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const Gazetteer = defineComponent({
  name: "GazetteerBoundary",
  emits: ["update:modelValue"],
  template: "<div />",
});

function mountSearch(view: Record<string, unknown>) {
  vi.stubGlobal("transformBboxToOpenLayers", transformBboxToOpenLayers);
  const wrapper = mount(Search, {
    global: {
      provide: { map: { getView: () => view } },
      stubs: {
        ...stubs,
        GazetteerSearch: Gazetteer,
        VExpandXTransition: Slot,
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
it("toggles the search and fits the map to a selected result with a usable extent", async () => {
  const view = { fit: vi.fn(), animate: vi.fn(), getZoom: () => 12 };
  const wrapper = mountSearch(view);
  const card = wrapper.get(".search-card");
  expect(card.attributes("style")).toContain("display: none");
  await wrapper.get("button").trigger("click");
  expect(card.attributes("style") ?? "").not.toContain("display: none");

  wrapper.getComponent(Gazetteer).vm.$emit("update:modelValue", {
    label: "Road",
    lat: 52.5,
    lon: 6.5,
    boundingbox: { south: 52, west: 6, north: 53, east: 7 },
  });
  await flushPromises();
  expect(view.fit).toHaveBeenCalledWith(
    transformBboxToOpenLayers([6, 52, 7, 53]),
    expect.objectContaining({ maxZoom: 18 }),
  );
  expect(view.animate).not.toHaveBeenCalled();
  expect(card.attributes("style")).toContain("display: none");
});
it("zooms to a point for results without a usable extent", async () => {
  const view = { fit: vi.fn(), animate: vi.fn(), getZoom: () => 12 };
  const wrapper = mountSearch(view);
  await wrapper.get("button").trigger("click");

  wrapper.getComponent(Gazetteer).vm.$emit("update:modelValue", {
    label: "Address",
    lat: 52.25,
    lon: 6.16,
    boundingbox: { south: 52.25, west: 6.16, north: 52.2501, east: 6.1601 },
  });
  await flushPromises();
  expect(view.fit).not.toHaveBeenCalled();
  expect(view.animate).toHaveBeenCalledWith(
    expect.objectContaining({ zoom: 17 }),
  );
});
it("renders paginated issue search, enriches category/tag labels and opens the selected issue", async () => {
  const response = ref({
    items: [
      {
        id: 1,
        title: "Safe crossing",
        legend_id: 1,
        tags: ["bike"],
        snippets: [{ text: "Safe crossing", source: "description" }],
        imageUrl: "/api/issues/1/image",
        comment_count: 2,
      },
      {
        id: 2,
        title: "Parking",
        legend_id: 99,
        tags: [],
        snippets: [],
        imageUrl: null,
        comment_count: 0,
      },
    ],
    total: 2,
  });
  const refreshList = vi.fn();
  const notifyEditing = vi.fn();
  const removeIssue = vi.fn();
  const activeLockIds = new Set<number>();
  const isConnected = ref(true);
  const socketStatus = ref("OPEN");
  const unsubscribe = vi.fn();
  let receiveList: ((message: { type: string }) => void) | undefined;
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({
    status: socketStatus,
    subscribe: (listener: (message: { type: string }) => void) => {
      receiveList = listener;
      return unsubscribe;
    },
  }));
  const unsubscribeComments = vi.fn();
  vi.stubGlobal("useSharedAuthWebSocket", () => ({
    subscribe: () => unsubscribeComments,
  }));
  const useFetch = vi.fn().mockResolvedValue({
    data: response,
    pending: ref(false),
    refresh: refreshList,
  });
  vi.stubGlobal("useFetch", useFetch);
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useAuth", () => ({
    status: ref("authenticated"),
    token: ref("test-token"),
  }));
  vi.stubGlobal("parseSearchTerms", parseSearchTerms);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: (id: number) => {
      const isLockedByOther = id === 1 ? "Test User" : false;
      return {
        isConnected: isConnected.value,
        isLockedByOther,
        canEdit: isConnected.value && !isLockedByOther,
      };
    },
  }));
  vi.stubGlobal("useIssueEditLock", (issueId: () => number | null) =>
    watch(
      issueId,
      (id, oldId) => {
        if (oldId !== null) {
          activeLockIds.delete(oldId);
          notifyEditing(oldId, false);
        }
        if (id !== null) {
          activeLockIds.add(id);
          notifyEditing(id, true);
        }
      },
      { immediate: true },
    ),
  );
  vi.stubGlobal("useIssuesMethods", () => ({
    get: vi.fn().mockResolvedValue({
      id: 2,
      slug: "parking",
      title: "Parking",
      description: "Description",
    }),
    getUpdatedBy: vi.fn(),
    remove: removeIssue,
  }));
  vi.stubGlobal("useSnackbar", () => ({ showError: vi.fn() }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#fff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
  vi.stubGlobal("useMatomoTracking", () => ({ trackSiteSearch: vi.fn() }));
  const Table = defineComponent({
    name: "ServerTableBoundary",
    props: [
      "items",
      "itemsLength",
      "page",
      "sortBy",
      "itemsPerPage",
      "headers",
    ],
    emits: ["click:row", "update:page"],
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          props.items.map((item: unknown) =>
            h(
              "div",
              Object.entries(slots).map(([, slot]) => slot?.({ item })),
            ),
          ),
        );
    },
  });
  const wrapper = mount(
    defineComponent({
      components: { List },
      template: "<Suspense><List /></Suspense>",
    }),
    {
      global: {
        components: {
          IssueSearchTable,
          IssueEditDialog,
          IssueDeleteDialog,
          IssueInfoDialog,
          IssueCommentsDialog,
        },
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          CategoryChip: true,
          Tag: true,
          EditForm: defineComponent({
            name: "EditFormBoundary",
            emits: ["update:dialog"],
            template:
              '<button aria-label="Close editor" @click="$emit(\'update:dialog\', false)">Close</button>',
          }),
          IssueComments: defineComponent({
            name: "IssueCommentsBoundary",
            props: ["issueId"],
            template:
              '<div class="issue-comments-stub">Comments for {{ issueId }}</div>',
          }),
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();
  expect(wrapper.text()).toContain("Safe crossing");
  const table = wrapper.getComponent(Table);
  expect(table.props("itemsLength")).toBe(2);
  expect(
    wrapper
      .find('button[aria-label="Safe crossing bewerkt door Test User"]')
      .exists(),
  ).toBe(true);
  expect(
    wrapper
      .get('button[aria-label="Safe crossing bewerkt door Test User"]')
      .text(),
  ).toContain("mdi-lock-outline");
  const lockedActions = wrapper.get(
    'button[aria-label="Safe crossing bewerkt door Test User"]',
  ).element.parentElement!;
  const unlockedActions = wrapper.get('button[aria-label="Parking bewerken"]')
    .element.parentElement!;
  expect(lockedActions.children).toHaveLength(4);
  expect(lockedActions.children[1]?.getAttribute("aria-hidden")).toBe("true");
  expect(lockedActions.children[2]?.getAttribute("aria-label")).toBe(
    "Informatie over Safe crossing",
  );
  expect(unlockedActions.children[2]?.getAttribute("aria-label")).toBe(
    "Informatie over Parking",
  );
  expect(
    wrapper.find('button[aria-label="Opmerkingen bij Safe crossing"]').exists(),
  ).toBe(true);
  expect(
    wrapper.find('button[aria-label="Opmerkingen bij Parking"]').exists(),
  ).toBe(true);
  expect(wrapper.find(".issue-comments-stub").exists()).toBe(false);
  await wrapper
    .get('button[aria-label="Opmerkingen bij Safe crossing"]')
    .trigger("click");
  expect(wrapper.get(".issue-comments-stub").text()).toBe("Comments for 1");
  expect(
    wrapper.find('button[aria-label="Safe crossing bewerken"]').exists(),
  ).toBe(false);
  expect(
    wrapper.find('button[aria-label="Safe crossing verwijderen"]').exists(),
  ).toBe(false);
  expect(wrapper.find('button[aria-label="Parking bewerken"]').exists()).toBe(
    true,
  );
  expect(
    wrapper.find('button[aria-label="Parking verwijderen"]').exists(),
  ).toBe(true);
  await wrapper.get('button[aria-label="Parking bewerken"]').trigger("click");
  expect(activeLockIds.has(2)).toBe(true);
  await flushPromises();
  await wrapper.get('button[aria-label="Close editor"]').trigger("click");
  await flushPromises();
  expect(activeLockIds.has(2)).toBe(false);
  expect(notifyEditing).toHaveBeenLastCalledWith(2, false);
  await wrapper
    .get('button[aria-label="Parking verwijderen"]')
    .trigger("click");
  isConnected.value = false;
  await flushPromises();
  const offlineButton = wrapper.get(
    'button[aria-label="Parking: verbinding verbroken"]',
  );
  expect(offlineButton.attributes("disabled")).toBeDefined();
  expect(offlineButton.text()).toContain("mdi-wifi-off");
  expect(
    wrapper
      .find('button[aria-label="Safe crossing: verbinding verbroken"]')
      .exists(),
  ).toBe(true);
  expect(
    wrapper
      .find('button[aria-label="Safe crossing bewerkt door Test User"]')
      .exists(),
  ).toBe(false);
  expect(wrapper.find('button[aria-label="Parking bewerken"]').exists()).toBe(
    false,
  );
  expect(
    wrapper.find('button[aria-label="Parking verwijderen"]').exists(),
  ).toBe(false);
  expect(
    wrapper.find('button[aria-label="Informatie over Parking"]').exists(),
  ).toBe(true);
  const confirmButton = wrapper
    .findAll("button")
    .find((button) => button.text() === "Verwijderen")!;
  expect(confirmButton.attributes("disabled")).toBeDefined();
  await confirmButton.trigger("click");
  expect(removeIssue).not.toHaveBeenCalled();
  isConnected.value = true;
  await flushPromises();
  expect(
    wrapper
      .find('button[aria-label="Safe crossing bewerkt door Test User"]')
      .exists(),
  ).toBe(true);
  expect(wrapper.find('button[aria-label="Parking bewerken"]').exists()).toBe(
    true,
  );
  expect(confirmButton.attributes("disabled")).toBeUndefined();
  table.vm.$emit("click:row", new Event("click"), {
    item: response.value.items[0],
  });
  expect(globalThis.navigateTo).toHaveBeenCalledWith("/kaart/1");
  table.vm.$emit("update:page", 2);
  await flushPromises();
  await wrapper.get("input").setValue("crossing");
  await vi.advanceTimersByTimeAsync(301);
  await flushPromises();
  expect(table.props("page")).toBe(1);
  const query = useFetch.mock.calls[0]![1].query.value;
  expect(query).toMatchObject({
    search: "crossing",
    itemsPerPage: 10,
  });
  expect(useFetch.mock.calls[0]![1].headers.value).toEqual({
    Authorization: "Bearer test-token",
  });
  expect(wrapper.findAll("img")).toHaveLength(1);
  expect(wrapper.get("img").attributes("src")).toBe(
    "/api/issues/1/image?width=300&height=300",
  );
  receiveList?.({ type: "issue-created" });
  expect(refreshList).toHaveBeenCalledTimes(1);
  socketStatus.value = "CLOSED";
  await flushPromises();
  socketStatus.value = "OPEN";
  await flushPromises();
  expect(refreshList).toHaveBeenCalledTimes(2);
  wrapper.unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

it("handles error when fetching issue for editing", async () => {
  const response = ref({
    items: [
      {
        id: 1,
        title: "Test Issue",
        legend_id: 1,
        tags: [],
        snippets: [],
        imageUrl: null,
        comment_count: 0,
      },
    ],
    total: 1,
  });
  const showError = vi.fn();
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({
    status: ref("OPEN"),
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useSharedAuthWebSocket", () => ({
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useFetch", () => ({
    data: response,
    pending: ref(false),
    refresh: vi.fn(),
  }));
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useAuth", () => ({
    status: ref("authenticated"),
    token: ref("test-token"),
  }));
  vi.stubGlobal("parseSearchTerms", parseSearchTerms);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: () => ({
      isConnected: true,
      isLockedByOther: false,
      canEdit: true,
    }),
  }));
  vi.stubGlobal("useIssueEditLock", () => vi.fn());
  vi.stubGlobal("useIssuesMethods", () => ({
    get: vi.fn().mockRejectedValue(new Error("Network error")),
    getUpdatedBy: vi.fn(),
    remove: vi.fn(),
  }));
  vi.stubGlobal("useSnackbar", () => ({ showError }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#fff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
  vi.stubGlobal("useMatomoTracking", () => ({ trackSiteSearch: vi.fn() }));

  const Table = defineComponent({
    name: "ServerTableBoundary",
    props: [
      "items",
      "itemsLength",
      "page",
      "sortBy",
      "itemsPerPage",
      "headers",
    ],
    emits: ["click:row"],
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          props.items.map((item: unknown) =>
            h(
              "div",
              Object.entries(slots).map(([, slot]) => slot?.({ item })),
            ),
          ),
        );
    },
  });

  const wrapper = mount(
    defineComponent({
      components: { List },
      template: "<Suspense><List /></Suspense>",
    }),
    {
      global: {
        components: {
          IssueSearchTable,
          IssueEditDialog,
          IssueDeleteDialog,
          IssueInfoDialog,
          IssueCommentsDialog,
        },
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          CategoryChip: true,
          Tag: true,
          EditForm: defineComponent({
            name: "EditFormBoundary",
            emits: ["update:dialog"],
            template:
              '<button aria-label="Close editor" @click="$emit(\'update:dialog\', false)">Close</button>',
          }),
          IssueComments: defineComponent({
            name: "IssueCommentsBoundary",
            props: ["issueId"],
            template: '<div class="issue-comments-stub">Comments</div>',
          }),
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();

  await wrapper.get('button[aria-label="Test Issue bewerken"]').trigger("click");
  await flushPromises();
  expect(showError).toHaveBeenCalledWith(
    "Issue kon niet worden geladen om te bewerken",
  );
});

it("handles lock being taken before edit dialog opens", async () => {
  const response = ref({
    items: [
      {
        id: 1,
        title: "Test Issue",
        legend_id: 1,
        tags: [],
        snippets: [],
        imageUrl: null,
        comment_count: 0,
      },
    ],
    total: 1,
  });
  const showError = vi.fn();
  let lockAvailable = true;
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({
    status: ref("OPEN"),
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useSharedAuthWebSocket", () => ({
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useFetch", () => ({
    data: response,
    pending: ref(false),
    refresh: vi.fn(),
  }));
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useAuth", () => ({
    status: ref("authenticated"),
    token: ref("test-token"),
  }));
  vi.stubGlobal("parseSearchTerms", parseSearchTerms);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: () => ({
      isConnected: true,
      isLockedByOther: lockAvailable ? false : "Other User",
      canEdit: lockAvailable,
    }),
  }));
  vi.stubGlobal("useIssueEditLock", () => vi.fn());
  vi.stubGlobal("useIssuesMethods", () => ({
    get: vi.fn().mockImplementation(() => {
      lockAvailable = false;
      return Promise.resolve({
        id: 1,
        slug: "test",
        title: "Test Issue",
        description: "Description",
      });
    }),
    getUpdatedBy: vi.fn(),
    remove: vi.fn(),
  }));
  vi.stubGlobal("useSnackbar", () => ({ showError }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#fff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
  vi.stubGlobal("useMatomoTracking", () => ({ trackSiteSearch: vi.fn() }));

  const Table = defineComponent({
    name: "ServerTableBoundary",
    props: [
      "items",
      "itemsLength",
      "page",
      "sortBy",
      "itemsPerPage",
      "headers",
    ],
    emits: ["click:row"],
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          props.items.map((item: unknown) =>
            h(
              "div",
              Object.entries(slots).map(([, slot]) => slot?.({ item })),
            ),
          ),
        );
    },
  });

  const wrapper = mount(
    defineComponent({
      components: { List },
      template: "<Suspense><List /></Suspense>",
    }),
    {
      global: {
        components: {
          IssueSearchTable,
          IssueEditDialog,
          IssueDeleteDialog,
          IssueInfoDialog,
          IssueCommentsDialog,
        },
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          CategoryChip: true,
          Tag: true,
          EditForm: defineComponent({
            name: "EditFormBoundary",
            emits: ["update:dialog"],
            template:
              '<button aria-label="Close editor" @click="$emit(\'update:dialog\', false)">Close</button>',
          }),
          IssueComments: defineComponent({
            name: "IssueCommentsBoundary",
            props: ["issueId"],
            template: '<div class="issue-comments-stub">Comments</div>',
          }),
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();

  await wrapper.get('button[aria-label="Test Issue bewerken"]').trigger("click");
  await flushPromises();
  expect(showError).toHaveBeenCalledWith(
    "Onderwerp wordt door iemand anders bewerkt",
  );
});

it("handles error when fetching issue info", async () => {
  const response = ref({
    items: [
      {
        id: 1,
        title: "Test Issue",
        legend_id: 1,
        tags: [],
        snippets: [],
        imageUrl: null,
        comment_count: 0,
      },
    ],
    total: 1,
  });
  const showError = vi.fn();
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({
    status: ref("OPEN"),
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useSharedAuthWebSocket", () => ({
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useFetch", () => ({
    data: response,
    pending: ref(false),
    refresh: vi.fn(),
  }));
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useAuth", () => ({
    status: ref("authenticated"),
    token: ref("test-token"),
  }));
  vi.stubGlobal("parseSearchTerms", parseSearchTerms);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: () => ({
      isConnected: true,
      isLockedByOther: false,
      canEdit: true,
    }),
  }));
  vi.stubGlobal("useIssueEditLock", () => vi.fn());
  vi.stubGlobal("useIssuesMethods", () => ({
    get: vi.fn(),
    getUpdatedBy: vi.fn().mockRejectedValue(new Error("Network error")),
    remove: vi.fn(),
  }));
  vi.stubGlobal("useSnackbar", () => ({ showError }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#fff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
  vi.stubGlobal("useMatomoTracking", () => ({ trackSiteSearch: vi.fn() }));

  const Table = defineComponent({
    name: "ServerTableBoundary",
    props: [
      "items",
      "itemsLength",
      "page",
      "sortBy",
      "itemsPerPage",
      "headers",
    ],
    emits: ["click:row"],
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          props.items.map((item: unknown) =>
            h(
              "div",
              Object.entries(slots).map(([, slot]) => slot?.({ item })),
            ),
          ),
        );
    },
  });

  const wrapper = mount(
    defineComponent({
      components: { List },
      template: "<Suspense><List /></Suspense>",
    }),
    {
      global: {
        components: {
          IssueSearchTable,
          IssueEditDialog,
          IssueDeleteDialog,
          IssueInfoDialog,
          IssueCommentsDialog,
        },
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          CategoryChip: true,
          Tag: true,
          EditForm: defineComponent({
            name: "EditFormBoundary",
            emits: ["update:dialog"],
            template:
              '<button aria-label="Close editor" @click="$emit(\'update:dialog\', false)">Close</button>',
          }),
          IssueComments: defineComponent({
            name: "IssueCommentsBoundary",
            props: ["issueId"],
            template: '<div class="issue-comments-stub">Comments</div>',
          }),
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();

  await wrapper.get('button[aria-label="Informatie over Test Issue"]').trigger("click");
  await flushPromises();
  expect(showError).toHaveBeenCalledWith(
    "Informatie over het issue kon niet worden geladen",
  );
});

it("ignores issue info when a different issue is selected while waiting", async () => {
  const response = ref({
    items: [
      {
        id: 1,
        title: "Test Issue 1",
        legend_id: 1,
        tags: [],
        snippets: [],
        imageUrl: null,
        comment_count: 0,
      },
      {
        id: 2,
        title: "Test Issue 2",
        legend_id: 1,
        tags: [],
        snippets: [],
        imageUrl: null,
        comment_count: 0,
      },
    ],
    total: 2,
  });
  const getUpdatedByCallOrder: number[] = [];
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({
    status: ref("OPEN"),
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useSharedAuthWebSocket", () => ({
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useFetch", () => ({
    data: response,
    pending: ref(false),
    refresh: vi.fn(),
  }));
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useAuth", () => ({
    status: ref("authenticated"),
    token: ref("test-token"),
  }));
  vi.stubGlobal("parseSearchTerms", parseSearchTerms);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: () => ({
      isConnected: true,
      isLockedByOther: false,
      canEdit: true,
    }),
  }));
  vi.stubGlobal("useIssueEditLock", () => vi.fn());
  vi.stubGlobal("useIssuesMethods", () => ({
    get: vi.fn(),
    getUpdatedBy: vi.fn().mockImplementation((id: number) => {
      getUpdatedByCallOrder.push(id);
      if (id === 1) {
        return new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              updated_by_name: "User 1",
              updated_at: "2024-01-01",
            });
          }, 100),
        );
      }
      return Promise.resolve({
        updated_by_name: "User 2",
        updated_at: "2024-01-02",
      });
    }),
    remove: vi.fn(),
  }));
  vi.stubGlobal("useSnackbar", () => ({ showError: vi.fn() }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#fff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
  vi.stubGlobal("useMatomoTracking", () => ({ trackSiteSearch: vi.fn() }));

  const Table = defineComponent({
    name: "ServerTableBoundary",
    props: [
      "items",
      "itemsLength",
      "page",
      "sortBy",
      "itemsPerPage",
      "headers",
    ],
    emits: ["click:row"],
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          props.items.map((item: unknown) =>
            h(
              "div",
              Object.entries(slots).map(([, slot]) => slot?.({ item })),
            ),
          ),
        );
    },
  });

  const wrapper = mount(
    defineComponent({
      components: { List },
      template: "<Suspense><List /></Suspense>",
    }),
    {
      global: {
        components: {
          IssueSearchTable,
          IssueEditDialog,
          IssueDeleteDialog,
          IssueInfoDialog,
          IssueCommentsDialog,
        },
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          CategoryChip: true,
          Tag: true,
          EditForm: defineComponent({
            name: "EditFormBoundary",
            emits: ["update:dialog"],
            template:
              '<button aria-label="Close editor" @click="$emit(\'update:dialog\', false)">Close</button>',
          }),
          IssueComments: defineComponent({
            name: "IssueCommentsBoundary",
            props: ["issueId"],
            template: '<div class="issue-comments-stub">Comments</div>',
          }),
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();

  const infoButtons = wrapper.findAll(
    'button[aria-label^="Informatie over"]',
  );
  await infoButtons[0].trigger("click");
  await flushPromises();
  await infoButtons[1].trigger("click");
  await flushPromises();
  await vi.advanceTimersByTimeAsync(150);
  await flushPromises();
  expect(getUpdatedByCallOrder).toEqual([1, 2]);
});

it("handles error when deleting issue", async () => {
  const response = ref({
    items: [
      {
        id: 1,
        title: "Test Issue",
        legend_id: 1,
        tags: [],
        snippets: [],
        imageUrl: null,
        comment_count: 0,
      },
    ],
    total: 1,
  });
  const showError = vi.fn();
  const refreshList = vi.fn();
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({
    status: ref("OPEN"),
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useSharedAuthWebSocket", () => ({
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useFetch", () => ({
    data: response,
    pending: ref(false),
    refresh: refreshList,
  }));
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useAuth", () => ({
    status: ref("authenticated"),
    token: ref("test-token"),
  }));
  vi.stubGlobal("parseSearchTerms", parseSearchTerms);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: () => ({
      isConnected: true,
      isLockedByOther: false,
      canEdit: true,
    }),
  }));
  vi.stubGlobal("useIssueEditLock", () => vi.fn());
  vi.stubGlobal("useIssuesMethods", () => ({
    get: vi.fn(),
    getUpdatedBy: vi.fn(),
    remove: vi.fn().mockRejectedValue(new Error("Network error")),
  }));
  vi.stubGlobal("useSnackbar", () => ({ showError }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#fff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
  vi.stubGlobal("useMatomoTracking", () => ({ trackSiteSearch: vi.fn() }));

  const Table = defineComponent({
    name: "ServerTableBoundary",
    props: [
      "items",
      "itemsLength",
      "page",
      "sortBy",
      "itemsPerPage",
      "headers",
    ],
    emits: ["click:row"],
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          props.items.map((item: unknown) =>
            h(
              "div",
              Object.entries(slots).map(([, slot]) => slot?.({ item })),
            ),
          ),
        );
    },
  });

  const wrapper = mount(
    defineComponent({
      components: { List },
      template: "<Suspense><List /></Suspense>",
    }),
    {
      global: {
        components: {
          IssueSearchTable,
          IssueEditDialog,
          IssueDeleteDialog,
          IssueInfoDialog,
          IssueCommentsDialog,
        },
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          CategoryChip: true,
          Tag: true,
          EditForm: defineComponent({
            name: "EditFormBoundary",
            emits: ["update:dialog"],
            template:
              '<button aria-label="Close editor" @click="$emit(\'update:dialog\', false)">Close</button>',
          }),
          IssueComments: defineComponent({
            name: "IssueCommentsBoundary",
            props: ["issueId"],
            template: '<div class="issue-comments-stub">Comments</div>',
          }),
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();

  await wrapper.get('button[aria-label="Test Issue verwijderen"]').trigger("click");
  await flushPromises();
  const confirmButton = wrapper
    .findAll("button")
    .find((button) => button.text() === "Verwijderen")!;
  await confirmButton.trigger("click");
  await flushPromises();
  expect(showError).toHaveBeenCalledWith("Issue kon niet worden verwijderd");
});

it("refreshes results after successful delete", async () => {
  const response = ref({
    items: [
      {
        id: 1,
        title: "Test Issue",
        legend_id: 1,
        tags: [],
        snippets: [],
        imageUrl: null,
        comment_count: 0,
      },
    ],
    total: 1,
  });
  const refreshList = vi.fn();
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({
    status: ref("OPEN"),
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useSharedAuthWebSocket", () => ({
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useFetch", () => ({
    data: response,
    pending: ref(false),
    refresh: refreshList,
  }));
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useAuth", () => ({
    status: ref("authenticated"),
    token: ref("test-token"),
  }));
  vi.stubGlobal("parseSearchTerms", parseSearchTerms);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: () => ({
      isConnected: true,
      isLockedByOther: false,
      canEdit: true,
    }),
  }));
  vi.stubGlobal("useIssueEditLock", () => vi.fn());
  vi.stubGlobal("useIssuesMethods", () => ({
    get: vi.fn(),
    getUpdatedBy: vi.fn(),
    remove: vi.fn().mockResolvedValue(undefined),
  }));
  vi.stubGlobal("useSnackbar", () => ({ showError: vi.fn() }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#fff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
  vi.stubGlobal("useMatomoTracking", () => ({ trackSiteSearch: vi.fn() }));

  const Table = defineComponent({
    name: "ServerTableBoundary",
    props: [
      "items",
      "itemsLength",
      "page",
      "sortBy",
      "itemsPerPage",
      "headers",
    ],
    emits: ["click:row"],
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          props.items.map((item: unknown) =>
            h(
              "div",
              Object.entries(slots).map(([, slot]) => slot?.({ item })),
            ),
          ),
        );
    },
  });

  const wrapper = mount(
    defineComponent({
      components: { List },
      template: "<Suspense><List /></Suspense>",
    }),
    {
      global: {
        components: {
          IssueSearchTable,
          IssueEditDialog,
          IssueDeleteDialog,
          IssueInfoDialog,
          IssueCommentsDialog,
        },
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          CategoryChip: true,
          Tag: true,
          EditForm: defineComponent({
            name: "EditFormBoundary",
            emits: ["update:dialog"],
            template:
              '<button aria-label="Close editor" @click="$emit(\'update:dialog\', false)">Close</button>',
          }),
          IssueComments: defineComponent({
            name: "IssueCommentsBoundary",
            props: ["issueId"],
            template: '<div class="issue-comments-stub">Comments</div>',
          }),
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();

  await wrapper.get('button[aria-label="Test Issue verwijderen"]').trigger("click");
  await flushPromises();
  const confirmButton = wrapper
    .findAll("button")
    .find((button) => button.text() === "Verwijderen")!;
  await confirmButton.trigger("click");
  await flushPromises();
  expect(refreshList).toHaveBeenCalled();
});

it("prevents delete when lock is not available", async () => {
  const response = ref({
    items: [
      {
        id: 1,
        title: "Test Issue",
        legend_id: 1,
        tags: [],
        snippets: [],
        imageUrl: null,
        comment_count: 0,
      },
    ],
    total: 1,
  });
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({
    status: ref("OPEN"),
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useSharedAuthWebSocket", () => ({
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useFetch", () => ({
    data: response,
    pending: ref(false),
    refresh: vi.fn(),
  }));
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useAuth", () => ({
    status: ref("authenticated"),
    token: ref("test-token"),
  }));
  vi.stubGlobal("parseSearchTerms", parseSearchTerms);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: () => ({
      isConnected: true,
      isLockedByOther: "Other User",
      canEdit: false,
    }),
  }));
  vi.stubGlobal("useIssueEditLock", () => vi.fn());
  vi.stubGlobal("useIssuesMethods", () => ({
    get: vi.fn(),
    getUpdatedBy: vi.fn(),
    remove: vi.fn(),
  }));
  vi.stubGlobal("useSnackbar", () => ({ showError: vi.fn() }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#fff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
  vi.stubGlobal("useMatomoTracking", () => ({ trackSiteSearch: vi.fn() }));

  const Table = defineComponent({
    name: "ServerTableBoundary",
    props: [
      "items",
      "itemsLength",
      "page",
      "sortBy",
      "itemsPerPage",
      "headers",
    ],
    emits: ["click:row"],
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          props.items.map((item: unknown) =>
            h(
              "div",
              Object.entries(slots).map(([, slot]) => slot?.({ item })),
            ),
          ),
        );
    },
  });

  const wrapper = mount(
    defineComponent({
      components: { List },
      template: "<Suspense><List /></Suspense>",
    }),
    {
      global: {
        components: {
          IssueSearchTable,
          IssueEditDialog,
          IssueDeleteDialog,
          IssueInfoDialog,
          IssueCommentsDialog,
        },
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          CategoryChip: true,
          Tag: true,
          EditForm: defineComponent({
            name: "EditFormBoundary",
            emits: ["update:dialog"],
            template:
              '<button aria-label="Close editor" @click="$emit(\'update:dialog\', false)">Close</button>',
          }),
          IssueComments: defineComponent({
            name: "IssueCommentsBoundary",
            props: ["issueId"],
            template: '<div class="issue-comments-stub">Comments</div>',
          }),
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();

  expect(
    wrapper.find('button[aria-label="Test Issue verwijderen"]').exists(),
  ).toBe(false);
});

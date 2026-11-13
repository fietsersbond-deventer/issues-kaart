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
const perform = vi.hoisted(() => vi.fn());
vi.mock("vuetify", () => ({ useDisplay: () => ({ mobile }) }));
vi.mock("../app/composables/useLocationSearch", async (original) => ({
  ...(await original<typeof import("../app/composables/useLocationSearch")>()),
  useLocationSearch: () => ({ search: perform, isSearching: ref(false) }),
}));
const mobile = ref(false);
const Autocomplete = defineComponent({
  name: "AutocompleteBoundary",
  props: ["items", "search"],
  emits: ["update:search", "update:modelValue", "blur"],
  methods: { focus: vi.fn() },
  template:
    '<div><input :value="search" @input="$emit(\'update:search\', $event.target.value)"><slot name="prepend-inner" /><slot name="append-inner" /><div v-for="item in items" :key="item.id"><slot name="item" :item="item" :props="{}" /></div></div>',
});
const stubs = {
  ...uiStubs,
  VIcon: defineComponent({
    props: ["icon"],
    template: '<span class="test-icon">{{ icon }}<slot /></span>',
  }),
  VAutocomplete: Autocomplete,
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
  perform.mockReset().mockResolvedValue([]);
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
it("searches with debounce, displays empty state and emits a selected projected extent", async () => {
  const wrapper = mount(Search, { global: { stubs } });
  wrappers.push(wrapper);
  await wrapper.get("input").setValue("missing");
  await vi.advanceTimersByTimeAsync(301);
  await flushPromises();
  expect(wrapper.text()).toContain("Geen resultaten gevonden");
  wrapper
    .getComponent(Autocomplete)
    .vm.$emit("update:modelValue", "no-results");
  expect(wrapper.emitted("selected")).toBeUndefined();
  const result = {
    id: "one",
    name: "Road",
    displayName: "Road, Town",
    type: "road",
    coordinates: [6, 52],
    boundingBox: [6, 52, 7, 53],
  };
  perform.mockResolvedValueOnce([result]);
  await wrapper.get("input").setValue("road");
  await vi.advanceTimersByTimeAsync(301);
  await flushPromises();
  expect(wrapper.text()).toContain("Road, Town");
  wrapper.getComponent(Autocomplete).vm.$emit("update:modelValue", "one");
  expect(wrapper.emitted("selected")?.at(-1)).toEqual([
    transformBboxToOpenLayers([6, 52, 7, 53]),
  ]);
  await wrapper.get("input").setValue("");
  await flushPromises();
  expect(wrapper.text()).not.toContain("Road, Town");
});
it("expands mobile search, focuses it, then closes on blur or selection", async () => {
  mobile.value = true;
  const wrapper = mount(Search, { global: { stubs } });
  wrappers.push(wrapper);
  expect(wrapper.find("input").exists()).toBe(false);
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(wrapper.emitted("searchExpanded")?.at(-1)).toEqual([true]);
  wrapper.getComponent(Autocomplete).vm.$emit("blur");
  await vi.advanceTimersByTimeAsync(201);
  expect(wrapper.find("input").exists()).toBe(false);
  await wrapper.get("button").trigger("click");
  await flushPromises();
  await wrapper.findAll("button").at(-1)!.trigger("click");
  expect(wrapper.emitted("searchExpanded")?.at(-1)).toEqual([false]);
});
it("renders paginated issue search, enriches category/tag labels and opens the selected issue", async () => {
  const response = ref({
    items: [
      {
        id: 1,
        title: "Safe crossing",
        legend_id: 1,
        tags: ["bike"],
        snippets: ["Safe crossing"],
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

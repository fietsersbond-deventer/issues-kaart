// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, defineComponent, h, reactive, ref, watch } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Slot, uiStubs } from "./helpers/ui";
import Search from "../app/components/map/Search.vue";
import List from "../app/pages/lijst/index.vue";
import IssueSearchTable from "../app/components/IssueSearchTable.vue";
import TablePagination from "../app/components/TablePagination.vue";
import IssueEditDialog from "../app/components/IssueEditDialog.vue";
import IssueDeleteDialog from "../app/components/IssueDeleteDialog.vue";
import IssueInfoDialog from "../app/components/IssueInfoDialog.vue";
import IssueCommentsDialog from "../app/components/IssueCommentsDialog.vue";
import PrintSelectionBar from "../app/components/PrintSelectionBar.vue";
import { usePrintSelection } from "../app/composables/usePrintSelection";
import { usePrintColumns } from "../app/composables/usePrintColumns";
import { usePrintOrientation } from "../app/composables/usePrintOrientation";
import PrintPage from "../app/pages/lijst/afdrukken.vue";
import QrCode from "../app/components/QrCode.vue";
import { getContrastColor } from "../app/utils/getContrastColor";
import { useFilter } from "../app/composables/useFilter";
import { parseDbTimestamp } from "../app/utils/parseDbTimestamp";
import { useFilterQuery } from "../app/composables/useFilterQuery";
import { useListQuery } from "../app/composables/useListQuery";
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
  VPagination: defineComponent({
    name: "VPagination",
    props: ["modelValue", "length", "totalVisible", "showFirstLastPage"],
    emits: ["update:modelValue"],
    template: "<div />",
  }),
  VSelect: defineComponent({
    name: "VSelect",
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template: "<div />",
  }),
  TablePagination,
  IssueFilter: true,
};
const route = reactive({
  path: "/lijst",
  query: {} as Record<string, string>,
});
const navigate = ({ query }: { query: Record<string, string> }) => {
  route.query = query;
  return Promise.resolve();
};
const router = { push: vi.fn(navigate), replace: vi.fn(navigate) };
const wrappers: Array<{
  unmount(): void;
}> = [];
beforeEach(() => {
  vueGlobals();
  mobile.value = false;
  vi.stubGlobal("useVDisplay", () => ({ mobile }));
  vi.useFakeTimers();
  vi.stubGlobal("useTitle", vi.fn());
  vi.stubGlobal("navigateTo", vi.fn());
  vi.stubGlobal("parseDbTimestamp", parseDbTimestamp);
  route.query = {};
  router.push.mockClear();
  router.replace.mockClear();
  vi.stubGlobal("useRoute", () => route);
  vi.stubGlobal("useRouter", () => router);
  vi.stubGlobal("useFilterQuery", useFilterQuery);
  vi.stubGlobal("useListQuery", useListQuery);
  vi.stubGlobal("usePrintSelection", usePrintSelection);
  sessionStorage.clear();
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
    emits: ["click:row", "update:page", "update:itemsPerPage"],
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
  route.query = { cat: "1", tag: "bike", other: "x" };
  await flushPromises();
  table.vm.$emit("click:row", new Event("click"), {
    item: response.value.items[0],
  });
  expect(globalThis.navigateTo).toHaveBeenCalledWith({
    path: "/kaart/1",
    query: { cat: "1", tag: "bike" },
  });
  table.vm.$emit("update:page", 2);
  await flushPromises();
  // query changes are pushed, so the back button undoes them
  expect(router.push).toHaveBeenLastCalledWith({
    query: { cat: "1", tag: "bike", other: "x", page: "2" },
  });
  expect(route.query.page).toBe("2");
  expect(table.props("page")).toBe(2);
  // page navigation above and below the table, with Fietsersbond-styled buttons
  const paginations = wrapper.findAllComponents(TablePagination);
  expect(paginations).toHaveLength(2);
  expect(paginations[0]!.text()).toContain("11–2 van 2");
  const bottomPager = paginations[1]!.getComponent({ name: "VPagination" });
  expect(bottomPager.props()).toMatchObject({
    modelValue: 2,
    length: 1,
    totalVisible: 7,
    showFirstLastPage: true,
  });
  // fewer buttons on mobile, so the outer ones stay on screen
  mobile.value = true;
  await flushPromises();
  expect(bottomPager.props()).toMatchObject({
    totalVisible: 5,
    showFirstLastPage: false,
  });
  mobile.value = false;
  bottomPager.vm.$emit("update:modelValue", 1);
  await flushPromises();
  expect(route.query.page).toBeUndefined();
  expect(
    paginations[0]!.getComponent({ name: "VPagination" }).props("modelValue"),
  ).toBe(1);
  table.vm.$emit("update:page", 2);
  await flushPromises();
  await wrapper.get("input").setValue("crossing");
  await vi.advanceTimersByTimeAsync(301);
  await flushPromises();
  // search goes to the URL as ?s= and returns to the first page
  expect(route.query).toEqual({
    cat: "1",
    tag: "bike",
    other: "x",
    s: "crossing",
  });
  expect(table.props("page")).toBe(1);
  // remembered for the list link, without unrelated parameters
  expect(globalThis.useState("last-list-query", () => ({})).value).toEqual({
    cat: "1",
    tag: "bike",
    s: "crossing",
  });
  const query = useFetch.mock.calls[0]![1].query.value;
  expect(query).toEqual({
    page: 1,
    search: "crossing",
    itemsPerPage: 10,
    cat: "1",
    tag: "bike",
  });
  // a changed filter also returns to the first page
  table.vm.$emit("update:page", 3);
  await flushPromises();
  route.query = { ...route.query, cat: "2" };
  await flushPromises();
  expect(route.query.page).toBeUndefined();
  // the automatic return to page 1 adds no extra history entry
  expect(router.replace).toHaveBeenCalledTimes(1);
  // browser navigation updates the search field
  route.query = { s: "parking" };
  await flushPromises();
  expect((wrapper.get("input").element as HTMLInputElement).value).toBe(
    "parking",
  );
  expect(useFetch.mock.calls[0]![1].query.value).toEqual({
    page: 1,
    search: "parking",
    itemsPerPage: 10,
  });
  // the page size is in the URL too and returns to the first page
  table.vm.$emit("update:page", 2);
  await flushPromises();
  table.vm.$emit("update:itemsPerPage", 25);
  await flushPromises();
  expect(route.query).toEqual({ s: "parking", pageSize: "25" });
  expect(table.props("itemsPerPage")).toBe(25);
  expect(useFetch.mock.calls[0]![1].query.value).toMatchObject({
    itemsPerPage: 25,
  });
  table.vm.$emit("update:itemsPerPage", 10);
  await flushPromises();
  expect(route.query).toEqual({ s: "parking" });
  route.query = { pageSize: "500" };
  await flushPromises();
  expect(table.props("itemsPerPage")).toBe(10);
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

it("selects issues for printing across pages when logged in", async () => {
  const authStatus = ref("authenticated");
  vi.stubGlobal("useAuth", () => ({ status: authStatus, token: ref("t") }));
  vi.stubGlobal(
    "useFetch",
    vi.fn().mockResolvedValue({
      data: ref({
        items: [
          {
            id: 1,
            title: "Safe crossing",
            legend_id: 1,
            tags: [],
            snippets: [],
            imageUrl: null,
          },
          {
            id: 2,
            title: "Parking",
            legend_id: 1,
            tags: [],
            snippets: [],
            imageUrl: null,
          },
        ],
        total: 12,
      }),
      pending: ref(false),
      refresh: vi.fn(),
    }),
  );
  const fetchIds = vi.fn().mockResolvedValue({ ids: [1, 2, 7] });
  vi.stubGlobal("$fetch", fetchIds);
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({
    status: ref("OPEN"),
    subscribe: () => vi.fn(),
  }));
  vi.stubGlobal("useSharedAuthWebSocket", () => ({ subscribe: () => vi.fn() }));
  vi.stubGlobal("useTagsApi", () => ({ getTag: (tag: string) => ({ tag }) }));
  vi.stubGlobal("parseSearchTerms", parseSearchTerms);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: () => ({
      isConnected: true,
      isLockedByOther: false,
      canEdit: true,
    }),
  }));
  vi.stubGlobal("useIssueEditLock", vi.fn());
  vi.stubGlobal("useIssuesMethods", () => ({}));
  const showError = vi.fn();
  vi.stubGlobal("useSnackbar", () => ({ showError }));
  vi.stubGlobal("useCategories", () => ({ categories: ref([]) }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
  vi.stubGlobal("useMatomoTracking", () => ({ trackSiteSearch: vi.fn() }));
  const Table = defineComponent({
    name: "ServerTableBoundary",
    props: ["items", "headers", "showSelect", "modelValue"],
    emits: ["click:row", "update:modelValue"],
    template:
      '<div><div v-for="item in items" :key="item.id"><slot name="item.title" :item="item" /></div></div>',
  });
  const wrapper = mount(
    defineComponent({
      components: { List },
      template: "<Suspense><List /></Suspense>",
    }),
    {
      global: {
        components: { IssueSearchTable, PrintSelectionBar },
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          IssueEditDialog: true,
          IssueDeleteDialog: true,
          IssueInfoDialog: true,
          IssueCommentsDialog: true,
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();
  const table = wrapper.getComponent(Table);
  const button = (text: string) =>
    wrapper.findAll("button").find((b) => b.text().includes(text))!;
  // the list's own button, which starts selecting
  const startButton = () =>
    wrapper
      .findAll("button")
      .find(
        (b) =>
          b.text().includes("Afdrukken") &&
          !b.element.closest(".print-selection-bar"),
      );
  expect(table.props("showSelect")).toBe(false);
  expect(wrapper.findComponent(PrintSelectionBar).exists()).toBe(false);
  // normally titles link to the issue
  expect(wrapper.find("a").exists()).toBe(true);

  await startButton()!.trigger("click");
  await flushPromises();
  expect(table.props("showSelect")).toBe(true);
  expect(startButton()).toBeUndefined();
  // no links or actions column while selecting: a row click selects
  expect(wrapper.find("a").exists()).toBe(false);
  expect(
    table.props("headers").map((h: { value: string }) => h.value),
  ).not.toContain("actions");
  expect(button("Afdrukken").attributes("disabled")).toBeDefined();
  table.vm.$emit("click:row", new Event("click"), { item: { id: 2 } });
  await flushPromises();
  expect(globalThis.navigateTo).not.toHaveBeenCalled();
  expect(table.props("modelValue")).toEqual([2]);
  // checkboxes; the selection is kept over pages
  table.vm.$emit("update:modelValue", [2, 1]);
  await flushPromises();
  route.query = { page: "2" };
  await flushPromises();
  expect(wrapper.text()).toContain("2 geselecteerd");

  route.query = { s: "fiets", cat: "1" };
  await flushPromises();
  await button("Alle 12 resultaten selecteren").trigger("click");
  await flushPromises();
  expect(fetchIds).toHaveBeenCalledWith("/api/issues/search", {
    query: { idsOnly: "1", search: "fiets", cat: "1" },
    headers: { Authorization: "Bearer t" },
  });
  expect(table.props("modelValue")).toEqual([2, 1, 7]);
  fetchIds.mockRejectedValueOnce(new Error("offline"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await button("Alle 12 resultaten selecteren").trigger("click");
  await flushPromises();
  expect(showError).toHaveBeenCalledWith(
    "Resultaten konden niet worden geselecteerd",
  );

  await button("Afdrukken").trigger("click");
  expect(globalThis.navigateTo).toHaveBeenCalledWith("/lijst/afdrukken");
  await button("Selectie wissen").trigger("click");
  await flushPromises();
  expect(wrapper.text()).toContain("0 geselecteerd");
  table.vm.$emit("update:modelValue", [1]);
  await button("Annuleren").trigger("click");
  await flushPromises();
  expect(table.props("showSelect")).toBe(false);
  expect(table.props("modelValue")).toEqual([]);
  table.vm.$emit("click:row", new Event("click"), {
    item: { id: 2, slug: "parking" },
  });
  expect(globalThis.navigateTo).toHaveBeenLastCalledWith({
    path: "/kaart/parking",
    query: { cat: "1" },
  });

  // selecting is not available when logged out
  await startButton()!.trigger("click");
  authStatus.value = "unauthenticated";
  await flushPromises();
  expect(table.props("showSelect")).toBe(false);
  expect(startButton()).toBeUndefined();
});
const head = ref<{ value: unknown }>();
function pageStyle() {
  return (head.value?.value as { style: { textContent: string }[] }).style[0]!
    .textContent;
}

function mountPrintPage(fetchIssues: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("$fetch", fetchIssues);
  vi.stubGlobal("definePageMeta", vi.fn());
  vi.stubGlobal("usePrintColumns", usePrintColumns);
  vi.stubGlobal("usePrintOrientation", usePrintOrientation);
  vi.stubGlobal("useHead", (input: () => unknown) => {
    head.value = computed(input);
  });
  vi.stubGlobal("getContrastColor", getContrastColor);
  vi.stubGlobal("useAuth", () => ({ token: ref("Bearer t") }));
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag === "bike" ? "Fiets" : "" }),
  }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#ffffff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useRuntimeConfig", () => ({
    public: { organization: { name: "Fietsersbond Deventer" } },
  }));
  vi.stubGlobal("useRequestURL", () => new URL("https://example.test/lijst"));
  const wrapper = mount(PrintPage, {
    global: {
      components: { QrCode },
      stubs: {
        ...stubs,
        VChipGroup: defineComponent({
          name: "VChipGroup",
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template: "<div><slot /></div>",
        }),
        VChip: Slot,
        VBtnToggle: defineComponent({
          name: "VBtnToggle",
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template: "<div><slot /></div>",
        }),
        VProgressLinear: true,
        VProgressCircular: true,
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

it("prints the selected issues with the chosen columns", async () => {
  localStorage.clear();
  sessionStorage.setItem("print-selected-ids", "[2,1]");
  const fetchIssues = vi.fn().mockResolvedValue([
    {
      id: 2,
      slug: "parking",
      title: "Parking",
      legend_id: 1,
      tags: ["bike", "cafe"],
      imageUrl: "/api/issues/2/image?v=1",
      updated_at: "2026-11-20 10:00:00",
      excerpt: "Fietsen staan overal",
      geometry: { type: "Point", coordinates: [6.1, 52.2] },
    },
    {
      id: 1,
      slug: "",
      title: "Safe crossing",
      legend_id: 9,
      tags: [],
      imageUrl: null,
      updated_at: "invalid",
      excerpt: "",
      geometry: { type: "Point", coordinates: [6.1, 52.2] },
    },
  ]);
  const renderMaps = vi.fn(
    async (
      issues: { id: number; legend?: { name: string } }[],
      { onImage }: { onImage: (id: number, url: string) => void },
    ) => {
      expect(issues[0]!.legend?.name).toBe("Routes");
      onImage(2, "data:image/png;base64,map");
    },
  );
  vi.stubGlobal("renderIssueMapImages", renderMaps);
  const wrapper = mountPrintPage(fetchIssues);
  await flushPromises();
  expect(fetchIssues).toHaveBeenCalledWith("/api/issues/print", {
    query: { ids: "2,1" },
    headers: { Authorization: "Bearer t" },
  });
  expect(wrapper.get("h1").text()).toBe("Fietsersbond Deventer – Onderwerpen");
  // landscape by default; portrait can be chosen and is remembered
  expect(pageStyle()).toContain("size: A4 landscape");
  expect(wrapper.find(".print-sheet--landscape").exists()).toBe(true);
  wrapper
    .getComponent({ name: "VBtnToggle" })
    .vm.$emit("update:modelValue", "portrait");
  await flushPromises();
  expect(pageStyle()).toContain("size: A4 portrait");
  expect(wrapper.find(".print-sheet--portrait").exists()).toBe(true);
  expect(localStorage.getItem("print-orientation")).toBe("portrait");
  expect(wrapper.text()).toContain("2 onderwerpen");
  // default columns
  expect(wrapper.findAll("th").map((th) => th.text())).toEqual([
    "Foto",
    "Onderwerp",
    "QR-code",
  ]);
  const rows = wrapper.findAll("tbody tr");
  expect(rows[0]!.text()).toContain("Parking");
  expect(rows[0]!.text()).toContain("Gewijzigd op 20 november 2026");
  expect(rows[0]!.get(".print-excerpt").text()).toBe("Fietsen staan overal");
  // title, date, excerpt
  expect(
    [...rows[0]!.get(".print-col-title a").element.children].map(
      (child) => child.className || child.tagName,
    ),
  ).toEqual(["STRONG", "print-date", "print-excerpt"]);
  expect(rows[1]!.find(".print-excerpt").exists()).toBe(false);
  // every cell links to the issue, without showing the address
  expect(rows[0]!.text()).not.toContain("https://");
  expect(
    rows[0]!.findAll("td").map((td) => td.get("a").attributes("href")),
  ).toEqual(Array(3).fill("https://example.test/kaart/parking"));
  expect(rows[1]!.get("a").attributes("href")).toBe(
    "https://example.test/kaart/1",
  );
  expect(rows[0]!.get("img").attributes("src")).toBe(
    "/api/issues/2/image?v=1&width=300&height=300",
  );
  expect(rows[0]!.get(".qr-code").attributes("aria-label")).toBe(
    "QR-code: https://example.test/kaart/parking",
  );
  expect(rows[0]!.get(".qr-code svg").exists()).toBe(true);
  expect(renderMaps).not.toHaveBeenCalled();

  wrapper
    .getComponent({ name: "VChipGroup" })
    .vm.$emit("update:modelValue", ["notes", "id", "categories", "map"]);
  await flushPromises();
  expect(wrapper.findAll("th").map((th) => th.text())).toEqual([
    "Nummer",
    "Categorie en tags",
    "Kaartje",
    "Notities",
  ]);
  expect(JSON.parse(localStorage.getItem("print-columns")!)).toEqual([
    "notes",
    "id",
    "categories",
    "map",
  ]);
  expect(rows[0]!.get(".print-category").text()).toBe("Routes");
  expect(rows[0]!.findAll(".print-tag").map((tag) => tag.text())).toEqual([
    "Fiets",
    "cafe",
  ]);
  expect(rows[1]!.find(".print-category").exists()).toBe(false);
  // the notes stay free for writing
  expect(rows[0]!.get(".print-col-notes").find("a").exists()).toBe(false);
  expect(renderMaps).toHaveBeenCalledTimes(1);
  expect(rows[0]!.get(".print-col-map img").attributes("src")).toBe(
    "data:image/png;base64,map",
  );
  // maps are made once
  wrapper
    .getComponent({ name: "VChipGroup" })
    .vm.$emit("update:modelValue", []);
  await flushPromises();
  wrapper
    .getComponent({ name: "VChipGroup" })
    .vm.$emit("update:modelValue", ["map"]);
  await flushPromises();
  expect(renderMaps).toHaveBeenCalledTimes(1);

  // waits for the images before printing
  const decode = vi.fn().mockRejectedValue(new Error("broken"));
  HTMLImageElement.prototype.decode = decode;
  const print = vi.fn();
  vi.stubGlobal("print", print);
  const printButton = wrapper
    .findAll("button")
    .find((button) => button.text().includes("Afdrukken"))!;
  await printButton.trigger("click");
  await flushPromises();
  expect(decode).toHaveBeenCalled();
  expect(print).toHaveBeenCalledTimes(1);
});

it("shows why there is nothing to print", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const renderMaps = vi.fn();
  vi.stubGlobal("renderIssueMapImages", renderMaps);
  const empty = mountPrintPage(vi.fn());
  await flushPromises();
  expect(empty.text()).toContain("Er zijn geen onderwerpen geselecteerd");
  expect(empty.find("table").exists()).toBe(false);

  sessionStorage.setItem("print-selected-ids", "[1]");
  const failed = mountPrintPage(vi.fn().mockRejectedValue(new Error("401")));
  await flushPromises();
  expect(failed.text()).toContain("De onderwerpen konden niet worden geladen");
  expect(renderMaps).not.toHaveBeenCalled();
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

  await wrapper
    .get('button[aria-label="Test Issue bewerken"]')
    .trigger("click");
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

  await wrapper
    .get('button[aria-label="Test Issue bewerken"]')
    .trigger("click");
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

  await wrapper
    .get('button[aria-label="Informatie over Test Issue"]')
    .trigger("click");
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

  const infoButtons = wrapper.findAll('button[aria-label^="Informatie over"]');
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

  await wrapper
    .get('button[aria-label="Test Issue verwijderen"]')
    .trigger("click");
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

  await wrapper
    .get('button[aria-label="Test Issue verwijderen"]')
    .trigger("click");
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

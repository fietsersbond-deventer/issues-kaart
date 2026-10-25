// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Slot, uiStubs } from "./helpers/ui";
import Search from "../app/components/map/Search.vue";
import List from "../app/pages/lijst/index.vue";
import { useFilter } from "../app/composables/useFilter";
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
  VIcon: true,
  VAutocomplete: Autocomplete,
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
      },
      {
        id: 2,
        title: "Parking",
        legend_id: 99,
        tags: [],
        snippets: [],
        imageUrl: null,
      },
    ],
    total: 2,
  });
  const refreshList = vi.fn();
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
  const useFetch = vi.fn().mockResolvedValue({
    data: response,
    pending: ref(false),
    refresh: refreshList,
  });
  vi.stubGlobal("useFetch", useFetch);
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useCategories", () => ({
    categories: ref([{ id: 1, name: "Routes", color: "#fff" }]),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useFilter", useFilter);
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
        stubs: {
          ...stubs,
          VDataTableServer: Table,
          CategoryChip: true,
          Tag: true,
        },
      },
    },
  );
  wrappers.push(wrapper);
  await flushPromises();
  expect(wrapper.text()).toContain("Safe crossing");
  const table = wrapper.getComponent(Table);
  expect(table.props("itemsLength")).toBe(2);
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
    orderBy: "created_at",
    order: "desc",
  });
  expect(wrapper.findAll("img")).toHaveLength(1);
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

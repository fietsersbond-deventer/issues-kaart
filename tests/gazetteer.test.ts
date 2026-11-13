// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import Gazetteer from "../app/components/Gazetteer.vue";
import { vueGlobals } from "./helpers/vue";
import { Button, Field } from "./helpers/ui";

const locationSearch = vi.fn();
const fetch = vi.fn();
const Menu = defineComponent({
  name: "VMenu",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  setup(_, { slots }) {
    return () =>
      h("div", [slots.activator?.({ props: {} }), slots.default?.()]);
  },
});
const List = defineComponent({
  name: "VList",
  setup(_, { slots }) {
    return () => h("div", slots.default?.());
  },
});
const ListItem = defineComponent({
  name: "VListItem",
  setup(_, { slots }) {
    return () =>
      h("div", [slots.prepend?.(), slots.title?.(), slots.default?.()]);
  },
});

function mountGazetteer() {
  return mount(Gazetteer, {
    global: {
      provide: { map: {} },
      stubs: {
        VMenu: Menu,
        VTextField: Field,
        VBtn: Button,
        VList: List,
        VListItem: ListItem,
        VListSubheader: true,
        VProgressCircular: true,
        VIcon: true,
        VTooltip: true,
        SearchResultIcon: true,
        SearchResultPreviewMap: true,
      },
    },
  });
}

beforeEach(() => {
  vueGlobals();
  vi.useFakeTimers();
  locationSearch.mockReset().mockResolvedValue([]);
  fetch.mockReset().mockResolvedValue([]);
  vi.stubGlobal("LocationIQSearchProvider", { search: locationSearch });
  vi.stubGlobal("PDOKSearchProvider", { defaultCollections: {} });
  vi.stubGlobal("tryCoordinateProviders", vi.fn().mockResolvedValue(null));
  vi.stubGlobal("useCurrentArea", () => ({
    bbox: [6, 52, 7, 53],
  }));
  vi.stubGlobal("$fetch", fetch);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Gazetteer search debounce", () => {
  it("searches once, one second after the latest input", async () => {
    locationSearch.mockResolvedValueOnce([
      {
        id: "synagogue",
        label: "Grote Synagoge, Prinsenplaats, Bergkwartier",
        lat: 52.25,
        lon: 6.16,
      },
    ]);
    const wrapper = mountGazetteer();

    await wrapper.get("input").setValue("par");
    await flushPromises();
    await vi.advanceTimersByTimeAsync(800);
    await wrapper.get("input").setValue("park");
    await flushPromises();
    await vi.advanceTimersByTimeAsync(999);
    expect(locationSearch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(locationSearch).toHaveBeenCalledTimes(1);
    expect(locationSearch).toHaveBeenCalledWith(
      "park",
      expect.objectContaining({ countrycodes: "nl" }),
    );
    expect(wrapper.text()).toContain(
      "Grote Synagoge, Prinsenplaats, Bergkwartier",
    );
    expect(wrapper.html()).not.toContain("v-tooltip");

    wrapper.unmount();
  });

  it("aborts an in-flight provider request when the input changes", async () => {
    let requestSignal: AbortSignal | undefined;
    locationSearch.mockImplementationOnce(
      (_query, params: GazetteerSearchParams) => {
        requestSignal = params.signal;
        return new Promise(() => {});
      },
    );
    const wrapper = mountGazetteer();

    await wrapper.get("input").setValue("par");
    await flushPromises();
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(requestSignal?.aborted).toBe(false);

    await wrapper.get("input").setValue("park");
    await flushPromises();
    expect(requestSignal?.aborted).toBe(true);

    wrapper.unmount();
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import Gazetteer from "../app/components/GazetteerSearch.vue";
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

  it("shows a direct coordinate match without calling the providers", async () => {
    vi.stubGlobal(
      "tryCoordinateProviders",
      vi
        .fn()
        .mockResolvedValue([{ id: "coord", label: "52, 6", lat: 52, lon: 6 }]),
    );
    const wrapper = mountGazetteer();

    await wrapper.get("input").setValue("52, 6");
    await flushPromises();
    await vi.advanceTimersByTimeAsync(2000);

    expect(wrapper.text()).toContain("52, 6");
    expect(locationSearch).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("selects the first location with the search button", async () => {
    const result = { id: "a", label: "Park, Deventer", lat: 52, lon: 6 };
    locationSearch.mockResolvedValueOnce([result]);
    const wrapper = mountGazetteer();

    await wrapper.get("input").setValue("park");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([result]);
    wrapper.unmount();
  });

  it("navigates to an issue before locations and clears results on empty input", async () => {
    const navigateTo = vi.fn();
    vi.stubGlobal("navigateTo", navigateTo);
    locationSearch.mockResolvedValueOnce([
      { id: "a", label: "Park", lat: 52, lon: 6 },
    ]);
    fetch.mockResolvedValueOnce([
      { id: 7, slug: "fietsroute", label: "Route" },
    ]);
    const wrapper = mountGazetteer();

    await wrapper.get("input").setValue("park");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    await wrapper.get("button").trigger("click");
    expect(navigateTo).toHaveBeenCalledWith("/kaart/fietsroute");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await wrapper.get("input").setValue("");
    await flushPromises();
    expect(wrapper.text()).not.toContain("Park");
    wrapper.unmount();
  });

  it("selects a clicked location with html label and shows a hover preview", async () => {
    const result = {
      id: "a",
      label: "Park",
      labelHtml: "<b>Park</b>",
      lat: 52,
      lon: 6,
    };
    locationSearch.mockResolvedValueOnce([result]);
    const wrapper = mountGazetteer();

    await wrapper.get("input").setValue("park");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(wrapper.html()).toContain("<b>Park</b>");

    const item = wrapper.findComponent(ListItem);
    await item.trigger("mouseenter");
    expect(wrapper.html()).toContain("search-result-preview-map-stub");
    await item.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([result]);
    wrapper.unmount();
  });

  it("shows a message when nothing is found and clears the input when the selection is reset", async () => {
    const wrapper = mountGazetteer();
    await wrapper.get("input").setValue("niks");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(wrapper.text()).toContain("Geen resultaten gevonden");

    await wrapper.setProps({
      modelValue: { id: "x", label: "X", lat: 1, lon: 1 },
    });
    await wrapper.setProps({ modelValue: undefined });
    expect((wrapper.get("input").element as HTMLInputElement).value).toBe("");
    wrapper.unmount();
  });
});

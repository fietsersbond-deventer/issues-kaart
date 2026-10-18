// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import LayerPreview from "../app/components/map/LayerPreview.vue";
import LayerSwitcher from "../app/components/map/LayerSwitcher.vue";

afterEach(() => vi.unstubAllGlobals());

describe("kaartlagen", () => {
  it("toont drie lagen en kiest een laag via muis of toetsenbord", async () => {
    vi.stubGlobal("useMapView", () => ({ center: ref([0, 0]), zoom: ref(12), rotation: ref(0) }));
    const wrapper = mount(LayerSwitcher, { props: { modelValue: "Licht" }, global: { components: { MapLayerPreview: LayerPreview }, stubs: {
      "ol-map": { template: "<div><slot /></div>" },
      "ol-view": true,
      "ol-tile-layer": { template: "<div><slot /></div>" },
      "ol-source-xyz": true,
      "ol-source-tile-wms": true,
    } } });
    const buttons = wrapper.findAll('[role="button"]');
    expect(buttons.map(button => button.attributes("aria-label"))).toEqual(["Kaartlaag Licht", "Kaartlaag Fiets", "Kaartlaag Foto"]);
    expect(buttons[0]!.attributes("aria-pressed")).toBe("true");
    await buttons[1]!.trigger("click");
    await buttons[2]!.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toEqual([["Fiets"], ["Foto"]]);
    wrapper.unmount();
  });
});

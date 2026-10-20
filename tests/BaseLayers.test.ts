// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { effectScope, nextTick, shallowRef, useTemplateRef, watch } from "vue";
import { OlTileLayer } from "vue3-openlayers/layers";
import { OlSourceXYZ, OlSourceWMTS } from "vue3-openlayers/sources";
import TileLayer from "ol/layer/Tile";
import WMTS from "ol/source/WMTS";
import XYZ from "ol/source/XYZ";
import { transform } from "ol/proj";
import BaseLayers from "../app/components/map/BaseLayers.vue";
import { useMapLayerPreference } from "../app/composables/useMapLayerPreference";

let wrapper: VueWrapper;
let preferenceScope: ReturnType<typeof effectScope>;
const layers: TileLayer[] = [];
const map = {
  addLayer: vi.fn((layer: TileLayer) => layers.push(layer)),
  removeLayer: vi.fn(),
};
function mountLayers() {
  wrapper = mount(BaseLayers, {
    global: {
      provide: { map },
      components: { "ol-tile-layer": OlTileLayer, "ol-source-xyz": OlSourceXYZ, "ol-source-wmts": OlSourceWMTS },
    },
  });
}
async function settle() {
  await nextTick();
  await nextTick();
}

beforeEach(() => {
  preferenceScope = effectScope();
  layers.length = 0;
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.stubGlobal("watch", watch);
  vi.stubGlobal("useTemplateRef", useTemplateRef);
  vi.stubGlobal("useMapLayerPreference", useMapLayerPreference);
});
afterEach(() => {
  wrapper?.unmount();
  preferenceScope.stop();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("BaseLayers met echte OpenLayers-componenten", () => {
  it("registreert lagen op de geïnjecteerde kaart en verwijdert ze bij unmount", async () => {
    mountLayers();
    await settle();
    expect(layers.map(layer => layer.get("title"))).toEqual(["Licht", "Fiets", "Foto", "Straatnamen"]);
    expect(layers.map(layer => layer.get("baseLayer"))).toEqual([true, true, true, false]);
    expect(layers.map(layer => layer.getVisible())).toEqual([true, false, false, false]);
    wrapper.unmount();
    expect(map.removeLayer.mock.calls.map(([layer]) => layer)).toEqual(layers);
  });

  it("behoudt XYZ- en WMTS-bronnen, attributie en RD-projectie", async () => {
    mountLayers();
    await settle();
    const light = layers[0]!.getSource() as XYZ;
    const cycle = layers[1]!.getSource() as XYZ;
    const photo = layers[2]!.getSource() as WMTS;
    const labels = layers[3]!.getSource() as WMTS;
    expect(light).toBeInstanceOf(XYZ);
    expect(cycle).toBeInstanceOf(XYZ);
    expect(light.getUrls()![0]).toContain("cartodb-basemaps");
    expect(cycle.getUrls()).toEqual(["https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"]);
    expect(photo).toBeInstanceOf(WMTS);
    expect(labels).toBeInstanceOf(WMTS);
    expect(photo.getLayer()).toBe("Actueel_ortho25");
    expect(labels.getLayer()).toBe("labels");
    for (const source of [photo, labels]) {
      expect(source.getProjection()!.getCode()).toBe("EPSG:28992");
      expect(source.getProjection()!.getExtent()).toEqual([-285401.92, 22598.08, 595401.92, 903401.92]);
      expect(source.getFormat()).toBe("image/png");
    }
    const rd = transform([5.38763888888889, 52.15616055555555], "EPSG:4326", "EPSG:28992");
    expect(rd[0]).toBeCloseTo(155029.794084, 5);
    expect(rd[1]).toBeCloseTo(463109.954315, 5);
    for (const [source, attribution] of [[light, "CARTO"], [cycle, "OpenStreetMap"], [photo, "Kadaster"]] as const) {
      const getAttributions = source.getAttributions()!;
      expect(String(getAttributions({} as Parameters<typeof getAttributions>[0]))).toContain(attribution);
    }
  });

  it.each(["Licht", "Fiets", "Foto"])("herstelt opgeslagen laag %s en koppelt fotolabels", async name => {
    sessionStorage.setItem("preferred-map-layer", name);
    mountLayers();
    await settle();
    expect(layers.map(layer => layer.getVisible())).toEqual([
      name === "Licht", name === "Fiets", name === "Foto", name === "Foto",
    ]);
  });

  it("wacht op een beschikbare laagref en ondersteunt de alternatieve layer-property", async () => {
    const preference = preferenceScope.run(() => useMapLayerPreference())!;
    const layerRef = shallowRef<{ layer?: TileLayer } | null>(null);
    preferenceScope.run(() => preference.watchLayerVisibility(layerRef, "Fiets"));
    layerRef.value = {};
    await settle();
    expect(preference.preferredLayer.value).toBe("Licht");
    const layer = new TileLayer({ visible: false });
    layerRef.value = { layer };
    await settle();
    layer.setVisible(true);
    await settle();
    expect(preference.preferredLayer.value).toBe("Fiets");
    preference.preferredLayer.value = "Foto";
    layer.setVisible(false);
    await settle();
    expect(preference.preferredLayer.value).toBe("Foto");
    layerRef.value = null;
    await settle();
  });

  it("deelt voorkeur met externe bediening en bewaart zichtbare laagwijzigingen", async () => {
    mountLayers();
    await settle();
    const { preferredLayer } = preferenceScope.run(() => useMapLayerPreference())!;
    preferredLayer.value = "Foto";
    await settle();
    expect(layers.map(layer => layer.getVisible())).toEqual([false, false, true, true]);
    expect(sessionStorage.getItem("preferred-map-layer")).toBe("Foto");
    layers[1]!.setVisible(true);
    await settle();
    expect(preferredLayer.value).toBe("Fiets");
    expect(layers.map(layer => layer.getVisible())).toEqual([false, true, false, false]);
    layers[2]!.setVisible(true);
    await settle();
    expect(preferredLayer.value).toBe("Foto");
    expect(layers[3]!.getVisible()).toBe(true);
  });
});

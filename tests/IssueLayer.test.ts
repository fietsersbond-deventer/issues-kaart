// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { computed, nextTick, toRaw, useTemplateRef } from "vue";
import { Collection, Feature } from "ol";
import type VectorLayer from "ol/layer/Vector";
import type VectorSource from "ol/source/Vector";
import { Point } from "ol/geom";
import type Modify from "ol/interaction/Modify";
import { ModifyEvent } from "ol/interaction/Modify";
import { Style } from "ol/style";
import { OlVectorLayer } from "vue3-openlayers/layers";
import { OlSourceVector } from "vue3-openlayers/sources";
import { OlFeature } from "vue3-openlayers/map";
import { OlGeomPoint, OlGeomLineString, OlGeomPolygon } from "vue3-openlayers/geometries";
import { OlInteractionModify } from "vue3-openlayers/interactions";
import type { MapIssue, Issue } from "../shared/types/Issue";
import IssueLayer from "../app/components/map/IssueLayer.vue";

let wrapper: VueWrapper;
let layer: VectorLayer;
let interaction: Modify;
const selectedFeatures = new Collection<Feature<Point>>();
const featureStyle = vi.fn(() => new Style());
const map = {
  addLayer: vi.fn((value: VectorLayer) => { layer = value; }),
  removeLayer: vi.fn(),
  addInteraction: vi.fn((value: Modify) => { interaction = value; }),
  removeInteraction: vi.fn(),
};
function issue(id: number, geometry: Issue["geometry"]): MapIssue {
  return {
    id, geometry, title: `Onderwerp ${id}`, tags: ["veilig"], legend_id: 1, imageUrl: null,
    legend: { id: 1, name: "Categorie", color: "red", description: "", created_at: "2026-01-01" },
  };
}
const issues = [
  issue(1, { type: "Point", coordinates: [6, 52] }),
  issue(2, { type: "LineString", coordinates: [[6, 52], [6.1, 52.1]] }),
  issue(3, { type: "Polygon", coordinates: [[[6, 52], [6.1, 52], [6, 52.1], [6, 52]]] }),
];
function mountLayer(modifyEnabled = false) {
  wrapper = mount(IssueLayer, {
    props: { issues, selectedFeatures, featureStyle, modifyEnabled },
    global: {
      provide: { map },
      components: {
        "ol-vector-layer": OlVectorLayer, "ol-source-vector": OlSourceVector, "ol-feature": OlFeature,
        "ol-geom-point": OlGeomPoint, "ol-geom-line-string": OlGeomLineString, "ol-geom-polygon": OlGeomPolygon,
        "ol-interaction-modify": OlInteractionModify,
      },
    },
  });
}
async function settle() { await nextTick(); await nextTick(); }
beforeEach(() => {
  vi.clearAllMocks();
  selectedFeatures.clear();
  vi.stubGlobal("computed", computed);
  vi.stubGlobal("useTemplateRef", useTemplateRef);
});
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); });

describe("IssueLayer met echte OpenLayers-componenten", () => {
  it("registreert geometrieën en styling op de geïnjecteerde kaart", async () => {
    mountLayer();
    await settle();
    const source = layer.getSource() as VectorSource;
    const features = source.getFeatures().sort((a, b) => a.get("id") - b.get("id"));
    expect(features.map(f => f.getGeometry()!.getType())).toEqual(["Point", "LineString", "Polygon"]);
    expect(features[0]!.get("title")).toBe("Onderwerp 1");
    expect(features[0]!.get("tags")).toEqual(["veilig"]);
    expect(features[0]!.getGeometry()!.getExtent()[0]).toBeCloseTo(667916.94476, 5);
    expect(layer.getStyleFunction()!(features[0]!, 1)).toBeInstanceOf(Style);
    expect(featureStyle).toHaveBeenCalledWith(features[0]);
    expect(layer.get("displayInLayerSwitcher")).toBe(false);
    await wrapper.setProps({ issues: [issues[1]!] });
    await settle();
    expect(source.getFeatures().map(f => f.get("id"))).toEqual([2]);
    wrapper.unmount();
    expect(map.removeLayer).toHaveBeenCalledWith(layer);
  });

  it("gebruikt de gedeelde selectiecollectie en geeft modifyend door", async () => {
    mountLayer();
    await settle();
    expect(map.addInteraction).not.toHaveBeenCalled();
    selectedFeatures.push(new Feature(new Point([0, 0])));
    await wrapper.setProps({ modifyEnabled: true });
    await settle();
    expect(map.addInteraction).toHaveBeenCalledOnce();
    const event = new ModifyEvent("modifyend", selectedFeatures, undefined!);
    interaction.dispatchEvent(event);
    expect(wrapper.emitted("modifyend")).toEqual([[event]]);
    expect(toRaw(wrapper.getComponent(OlInteractionModify).props("features"))).toBe(selectedFeatures);
    await wrapper.setProps({ modifyEnabled: false });
    expect(map.removeInteraction).toHaveBeenCalledWith(interaction);
  });
});

it("loads 27000 lines without per-feature Vue components and preserves unchanged feature identity", async () => {
  const large = Array.from({ length: 27000 }, (_, index) => issue(index + 1, { type: "LineString", coordinates: [[4.9, 52.3], [4.91, 52.31]] }));
  mountLayer();
  await wrapper.setProps({ issues: large });
  await settle();
  const source = layer.getSource() as VectorSource;
  expect(source.getFeatures()).toHaveLength(27000);
  expect(wrapper.findAllComponents(OlFeature)).toHaveLength(0);
  expect(wrapper.findAll('*').length).toBeLessThan(20);
  const retained = source.getFeatureById(27000);
  expect(retained?.get('title')).toBe('Onderwerp 27000');
  await wrapper.setProps({ issues: [...large.slice(1, -1), { ...large[26999]!, title: 'Changed' }] });
  await settle();
  expect(source.getFeatureById(27000)).toBe(retained);
  expect(retained?.get('title')).toBe('Changed');
  expect(source.getFeatureById(1)).toBeNull();
  expect(source.getFeatures()).toHaveLength(26999);
}, 15000);

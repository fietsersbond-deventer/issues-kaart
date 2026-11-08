// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { computed, nextTick, toRaw, useTemplateRef } from "vue";
import { Collection, Feature } from "ol";
import type VectorLayer from "ol/layer/Vector";
import type VectorSource from "ol/source/Vector";
import Cluster from "ol/source/Cluster";
import { Point } from "ol/geom";
import { get as getProjection } from "ol/proj";
import type Modify from "ol/interaction/Modify";
import { ModifyEvent } from "ol/interaction/Modify";
import { Style } from "ol/style";
import { OlVectorLayer } from "vue3-openlayers/layers";
import { OlSourceCluster, OlSourceVector } from "vue3-openlayers/sources";
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
        "ol-vector-layer": OlVectorLayer, "ol-source-vector": OlSourceVector, "ol-source-cluster": OlSourceCluster, "ol-feature": OlFeature,
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

  it("clustert alleen punten per categorie en herstelt de gewone laag bij zoom of bewerken", async () => {
    const points = [
      issue(1, { type: "Point", coordinates: [6, 52] }),
      issue(4, { type: "Point", coordinates: [6, 52] }),
      { ...issue(5, { type: "Point", coordinates: [6, 52] }), legend_id: 2 },
      issues[1]!,
      issues[2]!,
    ];
    wrapper = mount(IssueLayer, {
      props: { issues: points, selectedFeatures, featureStyle, modifyEnabled: false, clusterEnabled: true, zoom: 17, editing: false },
      global: {
        provide: { map },
        components: {
          "ol-vector-layer": OlVectorLayer, "ol-source-vector": OlSourceVector, "ol-source-cluster": OlSourceCluster, "ol-feature": OlFeature,
          "ol-geom-point": OlGeomPoint, "ol-geom-line-string": OlGeomLineString, "ol-geom-polygon": OlGeomPolygon,
          "ol-interaction-modify": OlInteractionModify,
        },
      },
    });
    await settle();
    const layers = map.addLayer.mock.calls.map(([added]) => added);
    const original = layers.find(added => !(added.getSource() instanceof Cluster))!;
    const clusterLayers = layers.filter(added => added.getSource() instanceof Cluster);
    expect(clusterLayers).toHaveLength(2);
    const clusterSources = clusterLayers.map(added => added.getSource() as Cluster);
    for (const cluster of clusterSources) {
      expect(cluster.getDistance()).toBe(20);
      expect(cluster.getMinDistance()).toBe(0);
      cluster.loadFeatures([-1e8, -1e8, 1e8, 1e8], 1, getProjection("EPSG:3857")!);
    }
    expect(clusterSources.map(cluster => (cluster.getFeatures()[0]!.get("features") as Feature[]).length).sort())
      .toEqual([1, 2]);
    const clusteredFeature = clusterSources[0]!.getFeatures()[0]!;
    featureStyle.mockClear();
    expect(clusterLayers[0]!.getStyleFunction()!(clusteredFeature, 1)).toBeInstanceOf(Style);
    expect(featureStyle).toHaveBeenCalledWith(clusteredFeature);
    const originalSource = original.getSource() as VectorSource;
    const point = originalSource.getFeatures().find(feature => feature.get("id") === 1)!;
    const line = originalSource.getFeatures().find(feature => feature.getGeometry()?.getType() === "LineString")!;
    expect(original.getStyleFunction()!(point, 1)).toBeUndefined();
    expect(original.getStyleFunction()!(line, 1)).toBeInstanceOf(Style);

    await wrapper.setProps({ issues: [points[0]!, points[2]!, points[3]!, points[4]!] });
    await settle();
    expect(clusterSources[0]!.getSource()!.getFeatures()).toHaveLength(1);
    await wrapper.setProps({ issues: [points[0]!, points[3]!, points[4]!] });
    await settle();
    expect(clusterSources[1]!.getSource()).toBeNull();
    expect(map.removeLayer).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ issues: points });
    await settle();

    await wrapper.setProps({ zoom: 18 });
    await settle();
    expect(map.removeLayer).toHaveBeenCalledTimes(3);
    expect(original.getStyleFunction()!(point, 1)).toBeInstanceOf(Style);
    await wrapper.setProps({ zoom: 17, editing: true });
    await settle();
    expect(original.getStyleFunction()!(point, 1)).toBeInstanceOf(Style);
    await wrapper.setProps({ editing: false });
    await settle();
    expect(map.addLayer).toHaveBeenCalledTimes(6);
    await wrapper.setProps({ clusterEnabled: false });
    await settle();
    expect(map.removeLayer).toHaveBeenCalledTimes(5);
    expect(original.getStyleFunction()!(point, 1)).toBeInstanceOf(Style);
  });
});

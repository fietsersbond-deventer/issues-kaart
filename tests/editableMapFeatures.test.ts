import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref, shallowRef, watch } from "vue";
import Feature from "ol/Feature";
import { Point, LineString, Polygon } from "ol/geom";
import VectorSource from "ol/source/Vector";
import { useEditableMapFeatures } from "../app/composables/useEditableMapFeatures";

beforeEach(() => {
  vi.stubGlobal("watch", watch);
  vi.stubGlobal("shallowRef", shallowRef);
});
afterEach(() => vi.unstubAllGlobals());

describe("bewerkselectie", () => {
  it.each([
    new Point([0, 0]),
    new LineString([[0, 0], [10, 10]]),
    new Polygon([[[0, 0], [10, 0], [10, 10], [0, 0]]]),
  ])("selecteert de huidige geometrie bij starten via URL of lijst (%s)", geometry => {
    const scope = effectScope();
    const feature = new Feature({ id: 125, geometry });
    const source = shallowRef(new VectorSource({ features: [feature] }));
    const id = ref<number | null>(125);
    const enabled = ref(false);
    const features = scope.run(() => useEditableMapFeatures(source, id, enabled))!;
    expect(features.value.getLength()).toBe(0);
    enabled.value = true;
    expect(features.value.getArray()).toEqual([feature]);
    enabled.value = false;
    expect(features.value.getLength()).toBe(0);
    scope.stop();
  });

  it("volgt bron, onderwerp en vervangende features zonder duplicaten; ruimt listeners op", () => {
    const scope = effectScope();
    const source = shallowRef<VectorSource<Feature<Point>> | undefined>();
    const id = ref<number | null>(125);
    const enabled = ref(true);
    const features = scope.run(() => useEditableMapFeatures(source, id, enabled))!;
    expect(features.value.getLength()).toBe(0);
    const first = new Feature({ id: 125, geometry: new Point([0, 0]) });
    const second = new Feature({ id: 126, geometry: new Point([1, 1]) });
    source.value = new VectorSource({ features: [first, second] });
    expect(features.value.getArray()).toEqual([first]);
    first.getGeometry()!.setCoordinates([2, 2]);
    expect(features.value.getArray()).toEqual([first]);
    id.value = 126;
    expect(features.value.getArray()).toEqual([second]);
    source.value.removeFeature(second);
    expect(features.value.getLength()).toBe(0);
    const replacement = new Feature({ id: 126, geometry: new Point([3, 3]) });
    source.value.addFeature(replacement);
    expect(features.value.getArray()).toEqual([replacement]);
    enabled.value = false; // drawing or cancelling
    expect(features.value.getLength()).toBe(0);
    enabled.value = true;
    expect(features.value.getArray()).toEqual([replacement]);
    id.value = null;
    expect(features.value.getLength()).toBe(0);
    id.value = 125;
    const oldSource = source.value;
    source.value = new VectorSource();
    expect(features.value.getLength()).toBe(0);
    expect(oldSource.hasListener("change")).toBe(false);
    scope.stop();
    expect(source.value.hasListener("change")).toBe(false);
  });
});

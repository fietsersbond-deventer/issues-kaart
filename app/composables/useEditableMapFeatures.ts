import type { Ref } from "vue";
import { Collection, type Feature } from "ol";
import type { Point, LineString, Polygon } from "ol/geom";
import type VectorSource from "ol/source/Vector";

type EditableFeature = Feature<Point | LineString | Polygon>;

/** Houd Modify gekoppeld aan de getekende vorm van het huidige onderwerp. */
export function useEditableMapFeatures(
  source: Ref<VectorSource<EditableFeature> | undefined>,
  selectedId: Ref<number | null>,
  enabled: Ref<boolean>,
) {
  const selectedFeatures = shallowRef(new Collection<EditableFeature>());

  watch([source, selectedId, enabled], ([currentSource, id, active], _, onCleanup) => {
    function sync() {
      const feature = active && id !== null
        ? currentSource?.getFeatures().find(feature => feature.get("id") === id)
        : undefined;
      const features = selectedFeatures.value;
      if (features.getLength() === (feature ? 1 : 0) && features.item(0) === feature) return;
      features.clear();
      if (feature) features.push(feature);
    }

    sync();
    // Vormen kunnen na de routewijziging verschijnen of na tekenen of filteren worden vervangen.
    currentSource?.on("change", sync);
    onCleanup(() => currentSource?.un("change", sync));
  }, { immediate: true, flush: "sync" });

  return selectedFeatures;
}

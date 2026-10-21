import type { Ref } from "vue";
import { Collection, type Feature } from "ol";
import type { Point, LineString, Polygon } from "ol/geom";
import type VectorSource from "ol/source/Vector";

type EditableFeature = Feature<Point | LineString | Polygon>;

/**
 * Returns the OpenLayers collection containing the feature Modify may edit:
 * only the selected issue, and only while editing is enabled.
 *
 * The source contains the rendered features. Reuse those same
 * objects so Modify changes the visible geometry instead of a copy.
 * Vue tracks the source, selection, and editing mode; OpenLayers events track changes
 * within the source, such as features loaded later or redrawn.
 */
export function useEditableMapFeatures(
  source: Ref<VectorSource<EditableFeature> | undefined>,
  selectedId: Ref<number | null>,
  enabled: Ref<boolean>,
) {
  // Modify holds a reference to this collection. Preserve the collection
  // and update only its contents; shallowRef keeps OpenLayers objects intact.
  const editableFeatures = shallowRef(new Collection<EditableFeature>());

  // Populate immediately and update synchronously when editing mode changes.
  watch([source, selectedId, enabled], ([currentSource, selectedIssueId, editingEnabled], _, onCleanup) => {
    function syncEditableFeature() {
      const feature = editingEnabled && selectedIssueId !== null
        ? currentSource?.getFeatureById(selectedIssueId)
        : undefined;
      const features = editableFeatures.value;
      // Dragging a vertex also changes the source. If the same
      // feature is already present, leave the collection and ongoing edit intact.
      if (features.getLength() === (feature ? 1 : 0) && features.item(0) === feature) return;
      features.clear();
      if (feature) features.push(feature);
    }

    syncEditableFeature();
    // Features may appear after navigation or be replaced after drawing or filtering.
    currentSource?.on("change", syncEditableFeature);
    // Remove the previous listener when watcher inputs change or the component unmounts.
    onCleanup(() => currentSource?.un("change", syncEditableFeature));
  }, { immediate: true, flush: "sync" });

  return editableFeatures;
}

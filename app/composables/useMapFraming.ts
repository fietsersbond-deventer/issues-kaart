import type { MapIssue, NewIssue, Issue } from "~~/shared/types/Issue";
import type { BBox } from "geojson";
import { useDebounceFn } from "@vueuse/core";
import type { FitOptions } from "ol/View";

export function useMapFraming(options: {
  selectedIssues: Ref<MapIssue[]>;
  selectedIssuesExtent: Ref<BBox | undefined>;
  defaultMapExtent: Ref<BBox | undefined>;
  selectedIssue: Ref<Issue | NewIssue | null>;
  fitExtent: (extent: BBox, fitOptions?: FitOptions) => void;
  recenterSelectedIssue: () => void;
}) {
  function frameMap() {
    if (options.selectedIssuesExtent.value) {
      options.fitExtent(
        options.selectedIssuesExtent.value,
        options.selectedIssues.value.length === 1 ? { maxZoom: 15 } : undefined,
      );
      return;
    }

    if (options.defaultMapExtent.value) {
      options.fitExtent(options.defaultMapExtent.value);
    }
  }

  const debouncedFrameMap = useDebounceFn(frameMap);
  let skipInitialExtentFit = Boolean(options.selectedIssue.value?.geometry);
  let skipNextExtentFit = false;

  watch(
    options.selectedIssue,
    () => {
      if (options.selectedIssue.value?.geometry) {
        skipNextExtentFit = true;
        options.recenterSelectedIssue();
      }
    },
    { immediate: true },
  );

  watch(
    [options.selectedIssues, options.defaultMapExtent],
    () => {
      if (skipInitialExtentFit || skipNextExtentFit) {
        skipInitialExtentFit = false;
        skipNextExtentFit = false;
        return;
      }

      debouncedFrameMap();
    },
    { deep: true },
  );

  return {
    frameMap,
  };
}

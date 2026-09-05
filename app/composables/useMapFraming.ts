import type { MapIssue, NewIssue, Issue } from "~~/shared/types/Issue";
import type { BBox } from "geojson";
import { useDebounceFn } from "@vueuse/core";
import type { FitOptions } from "ol/View";

export function useMapFraming(options: {
  mapReady: () => boolean;
  issuesReady: Ref<boolean>;
  selectedIssues: Ref<MapIssue[]>;
  selectedIssuesExtent: Ref<BBox | undefined>;
  defaultMapExtent: Ref<BBox | undefined>;
  selectedIssue: Ref<Issue | NewIssue | null>;
  selectedId: Ref<number | null>;
  fitExtent: (extent: BBox, fitOptions?: FitOptions) => void;
  recenterSelectedIssue: () => void;
}) {
  type CameraIntent = "initial" | "filter" | "select" | "resize" | "reset";
  const log = (event: string, details: Record<string, unknown> = {}) => {
    console.debug(`[map-camera] ${event}`, details);
  };

  let initialized = false;
  let generation = 0;
  let filterRequest = 0;
  let resizeRequest = 0;
  let skipNextResize = false;
  let startupSettling = false;

  const finishStartupSettling = useDebounceFn(() => {
    startupSettling = false;
    log("startup settled");
  }, 300);

  function getSelectedIssueId() {
    const issue = options.selectedIssue.value;
    return issue && "id" in issue ? issue.id : null;
  }

  function hasCurrentSelectedGeometry() {
    const geometry = options.selectedIssue.value?.geometry;
    if (!geometry) return false;

    return options.selectedId.value === getSelectedIssueId();
  }

  function fitVisibleIssues(intent: CameraIntent, requestGeneration: number) {
    if (requestGeneration !== generation) {
      log("fit skipped: stale generation", {
        intent,
        requestGeneration,
        generation,
      });
      return;
    }

    if (options.selectedIssuesExtent.value) {
      log("fit visible issues", {
        intent,
        generation,
        issueCount: options.selectedIssues.value.length,
        extent: options.selectedIssuesExtent.value,
      });
      options.fitExtent(
        options.selectedIssuesExtent.value,
        options.selectedIssues.value.length === 1 ? { maxZoom: 15 } : undefined,
      );
      return;
    }

    if (
      (intent === "initial" || intent === "reset") &&
      options.defaultMapExtent.value
    ) {
      log("fit default extent", {
        intent,
        generation,
        extent: options.defaultMapExtent.value,
      });
      options.fitExtent(options.defaultMapExtent.value);
      return;
    }

    log("fit skipped: no extent", { intent, generation });
  }

  function canInitialize() {
    const mapReady = options.mapReady();
    const issuesReady = options.issuesReady.value;
    if (!mapReady || !issuesReady) {
      log("initialization waiting", {
        mapReady,
        issuesReady,
        selectedId: options.selectedId.value,
      });
      return false;
    }
    if (options.selectedId.value !== null) {
      const ready = hasCurrentSelectedGeometry();
      if (!ready) log("initialization waiting: selected geometry");
      return ready;
    }
    const ready = Boolean(
      options.selectedIssuesExtent.value || options.defaultMapExtent.value,
    );
    if (!ready) log("initialization waiting: no extent");
    return ready;
  }

  function requestInitial() {
    log("initial requested", { initialized });
    if (initialized || !canInitialize()) return;

    initialized = true;
    generation += 1;
    filterRequest += 1;
    resizeRequest += 1;
    skipNextResize = true;
    startupSettling = true;
    finishStartupSettling();
    log("initial accepted", {
      generation,
      selectedId: options.selectedId.value,
      issueCount: options.selectedIssues.value.length,
    });
    const requestGeneration = generation;

    if (hasCurrentSelectedGeometry()) {
      log("initial action: select issue", { generation });
      options.recenterSelectedIssue();
      return;
    }

    fitVisibleIssues("initial", requestGeneration);
  }

  function requestSelect() {
    log("select requested", {
      selectedId: options.selectedId.value,
      issueId: getSelectedIssueId(),
      hasCurrentGeometry: hasCurrentSelectedGeometry(),
    });
    filterRequest += 1;
    resizeRequest += 1;

    if (!hasCurrentSelectedGeometry()) {
      log("select deferred: selected issue data is stale or incomplete");
      return;
    }

    initialized = true;
    generation += 1;
    skipNextResize = true;
    log("select action", { generation, selectedId: options.selectedId.value });
    options.recenterSelectedIssue();
  }

  const debouncedFilter = useDebounceFn((request: number) => {
    if (request !== filterRequest) {
      log("filter skipped: stale request", { request, filterRequest });
      return;
    }

    if (!initialized) {
      log("filter deferred: not initialized");
      requestInitial();
      return;
    }

    if (startupSettling) {
      log("filter skipped: startup settling");
      return;
    }

    generation += 1;
    log("filter action", {
      generation,
      issueCount: options.selectedIssues.value.length,
      extent: options.selectedIssuesExtent.value,
    });
    fitVisibleIssues("filter", generation);
  }, 100);

  function requestFilter() {
    filterRequest += 1;
    log("filter requested", { filterRequest });
    if (!initialized || startupSettling) {
      log("filter deferred: startup not settled");
      return;
    }
    debouncedFilter(filterRequest);
  }

  const debouncedResize = useDebounceFn((request: number) => {
    if (request !== resizeRequest) {
      log("resize skipped: stale request", { request, resizeRequest });
      return;
    }

    if (skipNextResize) {
      skipNextResize = false;
      log("resize skipped: startup camera already applied");
      return;
    }

    if (!initialized) {
      log("resize deferred: not initialized");
      requestInitial();
      return;
    }

    generation += 1;
    log("resize action", {
      generation,
      selectedId: options.selectedId.value,
      hasGeometry: Boolean(options.selectedIssue.value?.geometry),
    });
    if (options.selectedIssue.value?.geometry) {
      options.recenterSelectedIssue();
    }
  }, 100);

  function requestResize() {
    resizeRequest += 1;
    log("resize requested", { resizeRequest });
    if (!initialized || startupSettling) {
      log("resize deferred: startup not settled");
      return;
    }
    if (skipNextResize) {
      skipNextResize = false;
      log("resize skipped: startup camera already applied");
      return;
    }
    debouncedResize(resizeRequest);
  }

  function requestReset() {
    log("reset requested");
    filterRequest += 1;
    resizeRequest += 1;
    generation += 1;
    log("reset action", { generation });
    fitVisibleIssues("reset", generation);
  }

  watch(
    [
      options.selectedIssuesExtent,
      options.defaultMapExtent,
      options.issuesReady,
    ],
    () => {
      log("readiness changed", {
        issuesReady: options.issuesReady.value,
        issueCount: options.selectedIssues.value.length,
        hasSelectedExtent: Boolean(options.selectedIssuesExtent.value),
        hasDefaultExtent: Boolean(options.defaultMapExtent.value),
      });
      if (!initialized) requestInitial();
    },
    { deep: true, immediate: true },
  );

  watch(
    [
      options.selectedId,
      () => getSelectedIssueId(),
      () => options.selectedIssue.value?.geometry,
    ],
    (
      [selectedId, issueId, geometry],
      [previousSelectedId, previousIssueId, previousGeometry],
    ) => {
      log("selection state changed", {
        selectedId,
        previousSelectedId,
        issueId,
        previousIssueId,
        hasGeometry: Boolean(geometry),
        hadGeometry: Boolean(previousGeometry),
      });
      if (!initialized) {
        requestInitial();
        return;
      }

      const selectedNewIssue = selectedId !== previousSelectedId;
      const selectedIssueChanged = issueId !== previousIssueId;
      const geometryBecameAvailable = !previousGeometry && Boolean(geometry);
      if (selectedNewIssue || selectedIssueChanged || geometryBecameAvailable) {
        requestSelect();
      } else log("selection change ignored");
    },
  );

  return {
    requestInitial,
    requestFilter,
    requestResize,
    requestReset,
  };
}

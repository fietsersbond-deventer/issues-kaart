import type { Map as OLMap } from "ol";
import type { Ref } from "vue";
import { transform, transformExtent } from "ol/proj";
import centroid from "@turf/centroid";
import bbox from "@turf/bbox";
import type { Geometry } from "geojson";
import type { Issue } from "~/types/Issue";

/**
 * Composable that handles all map zoom logic:
 * - Initial zoom to all issues bbox
 * - Zoom to selected issue with adaptive padding
 * - Handles timing of map/issues/size availability
 * - Re-zoom on legend filter changes
 *
 * This is the single source of truth for map zoom behavior.
 * All watchers are set up automatically when this composable is called.
 *
 * @param mapRef - Reference to the OpenLayers map
 * @param paddingRef - Reference to current padding (from useAdaptivePadding)
 */
export function useMapZoom(
  mapRef: Ref<{ map?: OLMap } | null | undefined>,
  paddingRef: Ref<[number, number, number, number]>
) {
  const { issue: selectedIssue } = storeToRefs(useSelectedIssue());
  const { issues: allIssues } = storeToRefs(useIssues());
  const { visibleLegendIds } = storeToRefs(useLegendFilters());
  const { mapWidth, mapHeight } = useMapSize();

  // Track if we've done the initial "fit all issues" zoom
  const hasInitialZoom = ref(false);

  // Track if we've done the first selectedIssue zoom (to prevent re-zoom on initial padding change)
  const hasInitialSelectedZoom = ref(false);

  // Timer for delayed initial zoom (to wait for selectedIssue to load)
  let initialZoomTimer: ReturnType<typeof setTimeout> | null = null;

  // Timer to detect when padding has stabilized during initial load
  let paddingStabilizationTimer: ReturnType<typeof setTimeout> | null = null;
  const PADDING_STABILIZATION_MS = 200; // Wait 200ms after last padding change

  console.debug("[useMapZoom] initialized");

  /**
   * Zoom to fit all issues in view
   */
  function zoomToAllIssues(allIssues: Issue[]) {
    if (!mapRef.value?.map || allIssues.length === 0) {
      console.debug(
        "[useMapZoom] skipping zoomToAllIssues - no map or no issues"
      );
      return;
    }

    console.debug("[useMapZoom] zooming to all issues", {
      count: allIssues.length,
    });

    // Calculate combined bbox of all issues
    const issuesWithGeometry = allIssues.filter((issue) => issue.geometry);
    if (issuesWithGeometry.length === 0) return;

    // Get all coordinates
    const allCoords: number[][] = [];
    issuesWithGeometry.forEach((issue) => {
      if (issue.geometry) {
        const [minLng, minLat, maxLng, maxLat] = bbox(issue.geometry);
        allCoords.push([minLng, minLat]);
        allCoords.push([maxLng, maxLat]);
      }
    });

    // Calculate overall bbox
    const minLng = Math.min(...allCoords.map((c) => c[0]!));
    const minLat = Math.min(...allCoords.map((c) => c[1]!));
    const maxLng = Math.max(...allCoords.map((c) => c[0]!));
    const maxLat = Math.max(...allCoords.map((c) => c[1]!));

    // Transform to map projection
    const extent = transformExtent(
      [minLng, minLat, maxLng, maxLat],
      "EPSG:4326",
      "EPSG:3857"
    );

    const view = mapRef.value.map.getView();
    view.fit(extent, {
      padding: [50, 50, 50, 50],
      duration: 400,
      maxZoom: 16,
    });

    hasInitialZoom.value = true;
    console.debug("[useMapZoom] zoomed to all issues bbox");
  }

  /**
   * Zoom to the selected issue with adaptive padding
   */
  function zoomToSelectedIssue() {
    console.debug("[useMapZoom] zoomToSelectedIssue called", {
      hasGeometry: !!selectedIssue.value?.geometry,
      hasMap: !!mapRef.value?.map,
      issueId: selectedIssue.value?.id,
      mapWidth: mapWidth.value,
      mapHeight: mapHeight.value,
      padding: paddingRef.value,
    });

    if (!selectedIssue.value?.geometry || !mapRef.value?.map) return;

    // Skip if map size is not yet known (will be triggered again by mapSize watcher)
    if (mapWidth.value === 0 || mapHeight.value === 0) {
      console.debug("[useMapZoom] skipping - map size not yet known");
      return;
    }

    const geometry = selectedIssue.value.geometry as Geometry;
    const view = mapRef.value.map.getView();

    console.debug("[useMapZoom] zooming to selected issue", {
      geometryType: geometry.type,
      issueId: selectedIssue.value.id,
      padding: paddingRef.value,
    });

    // For points, zoom to a specific level
    if (geometry.type === "Point") {
      const centerPoint = centroid(geometry);
      const center = transform(
        centerPoint.geometry.coordinates,
        "EPSG:4326",
        "EPSG:3857"
      );

      const currentZoom = view.getZoom() || 13;
      const targetZoom = Math.max(currentZoom, 15);

      console.debug("[useMapZoom] animating to Point", {
        center,
        currentZoom,
        targetZoom,
        coordinates: centerPoint.geometry.coordinates,
      });

      view.animate({
        center,
        zoom: targetZoom,
        duration: 600,
      });

      console.debug("[useMapZoom] Point animation started");
    } else {
      // For LineStrings and Polygons, fit to bounding box with adaptive padding
      const [minLng, minLat, maxLng, maxLat] = bbox(geometry);
      const extent = transformExtent(
        [minLng, minLat, maxLng, maxLat],
        "EPSG:4326",
        "EPSG:3857"
      );

      console.debug("[useMapZoom] calling view.fit", {
        extent,
        padding: paddingRef.value,
        geometryType: geometry.type,
      });

      view.fit(extent, {
        padding: paddingRef.value,
        duration: 600,
        maxZoom: 17,
      });

      console.debug("[useMapZoom] view.fit called successfully");
    }

    // Don't set hasInitialSelectedZoom here - let padding watcher handle it
    // This prevents double-zoom when controls size is measured after first zoom
  }

  // ===== AUTO-SETUP WATCHERS =====
  // All watchers are automatically set up when the composable is called

  // Watch for all issues loading (initial zoom)
  watch(
    allIssues,
    (issues) => {
      console.debug("[useMapZoom] allIssues watcher triggered", {
        count: issues.length,
        hasSelectedIssue: !!selectedIssue.value?.geometry,
        hasInitialZoom: hasInitialZoom.value,
      });

      // Only schedule initial zoom if:
      // 1. We haven't done initial zoom yet
      // 2. We have issues to show
      if (!hasInitialZoom.value && issues.length > 0) {
        // Clear any pending zoom
        if (initialZoomTimer) {
          clearTimeout(initialZoomTimer);
          initialZoomTimer = null;
        }

        // If selectedIssue is already loaded, skip zoom to all
        if (selectedIssue.value?.geometry) {
          hasInitialZoom.value = true;
          console.debug(
            "[useMapZoom] skipping zoom to all - selected issue already loaded"
          );
          return;
        }

        // Wait a bit to see if a selectedIssue arrives
        // If it does, the selectedIssue watcher will cancel this timer
        initialZoomTimer = setTimeout(() => {
          console.debug("[useMapZoom] executing delayed zoom to all issues");
          if (!selectedIssue.value?.geometry) {
            zoomToAllIssues(issues);
          } else {
            hasInitialZoom.value = true;
            console.debug(
              "[useMapZoom] cancelled - selected issue loaded in the meantime"
            );
          }
          initialZoomTimer = null;
        }, 100); // 100ms delay to wait for selectedIssue

        console.debug(
          "[useMapZoom] scheduled delayed zoom to all issues (100ms)"
        );
      }
    },
    { immediate: true }
  );

  // Watch for selected issue changes
  watch(
    selectedIssue,
    (newIssue, oldIssue) => {
      console.debug("[useMapZoom] selectedIssue watcher triggered", {
        issueId: newIssue?.id,
        oldIssueId: oldIssue?.id,
        hasGeometry: !!newIssue?.geometry,
        hasMap: !!mapRef.value?.map,
      });

      if (newIssue?.geometry) {
        // Cancel pending "zoom to all" if any
        if (initialZoomTimer) {
          console.debug(
            "[useMapZoom] cancelling zoom to all - selected issue arrived"
          );
          clearTimeout(initialZoomTimer);
          initialZoomTimer = null;
        }

        // Mark initial zoom as done
        hasInitialZoom.value = true;

        // Reset initial selected zoom flag if it's a different issue OR first load (oldIssue is undefined)
        if (!oldIssue || oldIssue?.id !== newIssue.id) {
          hasInitialSelectedZoom.value = false;
          console.debug(
            "[useMapZoom] reset hasInitialSelectedZoom for new/different issue"
          );
        }

        // Zoom to selected issue
        zoomToSelectedIssue();
      }
    },
    { deep: true, immediate: true }
  );

  // Watch for map becoming available (for initial load when issue is already selected)
  watch(
    () => mapRef.value?.map,
    (map) => {
      console.debug("[useMapZoom] map watcher triggered", {
        hasMap: !!map,
        hasSelectedIssue: !!selectedIssue.value?.geometry,
        issueId: selectedIssue.value?.id,
      });

      if (map && selectedIssue.value?.geometry) {
        zoomToSelectedIssue();
      }
    }
  );

  // Watch for map size becoming available
  watch([mapWidth, mapHeight], ([width, height]) => {
    console.debug("[useMapZoom] mapSize watcher triggered", {
      width,
      height,
      hasSelectedIssue: !!selectedIssue.value?.geometry,
    });

    if (
      width > 0 &&
      height > 0 &&
      selectedIssue.value?.geometry &&
      mapRef.value?.map
    ) {
      // Reset flag since we're about to do a fresh zoom
      hasInitialSelectedZoom.value = false;
      console.debug(
        "[useMapZoom] reset hasInitialSelectedZoom for mapSize-triggered zoom"
      );
      zoomToSelectedIssue();
    }
  });

  // Watch for padding changes (e.g., when controls open/close)
  watch(
    paddingRef,
    (newPadding, oldPadding) => {
      // Only re-zoom if:
      // 1. Padding actually changed
      // 2. We have a selected issue
      // 3. We've already done the initial zoom (prevents re-zoom during initial load)
      const hasChanged = newPadding.some(
        (val, idx) => val !== oldPadding?.[idx]
      );

      console.debug("[useMapZoom] padding watcher triggered", {
        hasChanged,
        newPadding,
        oldPadding,
        hasSelectedIssue: !!selectedIssue.value?.geometry,
        hasInitialSelectedZoom: hasInitialSelectedZoom.value,
      });

      // During initial load, wait for padding to stabilize before allowing re-zooms
      if (
        hasChanged &&
        !hasInitialSelectedZoom.value &&
        selectedIssue.value?.geometry
      ) {
        // Clear previous stabilization timer
        if (paddingStabilizationTimer) {
          clearTimeout(paddingStabilizationTimer);
        }

        // Wait for padding to stabilize (no changes for PADDING_STABILIZATION_MS)
        paddingStabilizationTimer = setTimeout(() => {
          console.debug(
            "[useMapZoom] padding stabilized - marking hasInitialSelectedZoom as complete"
          );
          hasInitialSelectedZoom.value = true;
          paddingStabilizationTimer = null;
        }, PADDING_STABILIZATION_MS);

        console.debug(
          "[useMapZoom] padding changed during initial load - waiting for stabilization"
        );
        return;
      }

      // Subsequent padding changes - re-zoom (e.g., legend opened/closed)
      if (
        hasChanged &&
        hasInitialSelectedZoom.value &&
        selectedIssue.value?.geometry &&
        mapRef.value?.map
      ) {
        console.debug("[useMapZoom] re-zooming due to padding change");
        zoomToSelectedIssue();
      }
    },
    { deep: true }
  );

  // Watch for legend filter changes
  watch(
    visibleLegendIds,
    () => {
      console.debug("[useMapZoom] visibleLegendIds watcher triggered", {
        hasSelectedIssue: !!selectedIssue.value?.geometry,
      });

      // If there's a selected issue, re-zoom to it (important when going back to show-all)
      if (selectedIssue.value?.geometry && mapRef.value?.map) {
        zoomToSelectedIssue();
      } else if (allIssues.value.length > 0) {
        // Otherwise zoom to all visible issues
        zoomToAllIssues(allIssues.value);
      }
    },
    { deep: true }
  );

  return {
    zoomToAllIssues,
    zoomToSelectedIssue,
  };
}

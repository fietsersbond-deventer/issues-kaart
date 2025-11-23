import type { Map as OLMap } from "ol";
import type { Ref } from "vue";
import { transform, transformExtent } from "ol/proj";
import bbox from "@turf/bbox";
import type { Geometry } from "geojson";

interface ControlsSize {
  width: number;
  height: number;
}

/**
 * Composable that manages adaptive padding for map zoom operations
 * based on the geometry position and controls size.
 *
 * The controls are in the bottom-left corner, so we calculate where
 * there's most free space around the geometry to avoid overlap.
 *
 * This composable owns the padding state and automatically recalculates
 * when controls size changes.
 */
export function useAdaptivePadding(
  mapRef: Ref<{ map?: OLMap } | null | undefined>,
  controlsSize: Ref<ControlsSize>
) {
  const { mapHeight, mapWidth } = useMapSize();
  const { issue: selectedIssue } = storeToRefs(useSelectedIssue());
  const basePadding = 50; // Minimum padding on all sides

  // Current padding state [top, right, bottom, left]
  const currentPadding = ref<[number, number, number, number]>([
    basePadding,
    basePadding,
    basePadding,
    basePadding,
  ]);

  // Track last geometry we calculated padding for
  const lastGeometry = ref<Geometry | null>(null);

  // Debounce timer for padding updates
  let paddingDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const PADDING_DEBOUNCE_MS = 150; // Wait 150ms after last change

  /**
   * Calculate optimal padding for a given geometry
   * Returns [top, right, bottom, left] padding in pixels
   */
  function calculatePadding(
    geometry: Geometry | null | undefined
  ): [number, number, number, number] {
    if (!geometry || !mapRef.value?.map) {
      // Default padding when no geometry
      return [
        basePadding,
        basePadding,
        Math.max(basePadding, controlsSize.value.height + 20),
        basePadding,
      ];
    }

    const view = mapRef.value.map.getView();
    const controlsWidth = controlsSize.value.width;
    const controlsHeight = controlsSize.value.height;

    // For LineStrings, analyze the actual line points instead of just the bbox
    if (geometry.type === "LineString") {
      const coordinates = geometry.coordinates as number[][];

      console.debug("[useAdaptivePadding] analyzing LineString", {
        pointCount: coordinates.length,
        mapWidth: mapWidth.value,
        mapHeight: mapHeight.value,
        controlsWidth,
        controlsHeight,
      });

      // Count points in different regions
      let pointsInControlsArea = 0;
      let pointsAboveControls = 0;
      let pointsRightOfControls = 0;
      let totalPoints = 0;

      for (const coord of coordinates) {
        const transformed = transform(coord, "EPSG:4326", "EPSG:3857");
        const pixel = mapRef.value?.map?.getPixelFromCoordinate(transformed);

        if (!pixel) continue;

        totalPoints++;
        const x = pixel[0] ?? 0;
        const y = pixel[1] ?? 0;

        const inControlsX = x < controlsWidth;
        const inControlsY = y > mapHeight.value - controlsHeight;

        if (inControlsX && inControlsY) {
          pointsInControlsArea++;
        }
        if (y < mapHeight.value - controlsHeight) {
          pointsAboveControls++;
        }
        if (x > controlsWidth) {
          pointsRightOfControls++;
        }
      }

      // If majority of points are NOT in controls area, but some are
      if (totalPoints > 0) {
        const ratioInControls = pointsInControlsArea / totalPoints;
        const ratioAbove = pointsAboveControls / totalPoints;
        const ratioRight = pointsRightOfControls / totalPoints;

        console.debug("[useAdaptivePadding] LineString analysis", {
          totalPoints,
          pointsInControlsArea,
          pointsAboveControls,
          pointsRightOfControls,
          ratioInControls,
          ratioAbove,
          ratioRight,
        });

        // If most of the line is above or right of controls, but bbox would overlap
        // This catches diagonal lines from bottom-left to top-right
        if (ratioInControls < 0.5 && (ratioRight > 0.5 || ratioAbove > 0.5)) {
          // Most points are outside controls area
          if (ratioRight > ratioAbove) {
            // More points to the right - add left padding
            return [
              basePadding,
              basePadding,
              basePadding,
              Math.max(basePadding, controlsWidth + 40),
            ];
          } else {
            // More points above - add bottom padding
            return [
              basePadding,
              basePadding,
              Math.max(basePadding, controlsHeight + 40),
              basePadding,
            ];
          }
        }

        // If significant portion is in controls area
        if (ratioInControls > 0.3) {
          if (pointsAboveControls > 0 && pointsRightOfControls > 0) {
            // Line spans from controls area to top-right: prefer left padding
            return [
              basePadding,
              basePadding,
              basePadding,
              Math.max(basePadding, controlsWidth + 40),
            ];
          } else if (pointsAboveControls > 0) {
            // Line goes upward: add bottom padding
            return [
              basePadding,
              basePadding,
              Math.max(basePadding, controlsHeight + 40),
              basePadding,
            ];
          } else if (pointsRightOfControls > 0) {
            // Line goes rightward: add left padding
            return [
              basePadding,
              basePadding,
              basePadding,
              Math.max(basePadding, controlsWidth + 40),
            ];
          }
        }
      }

      // Line doesn't conflict with controls or fits well with default padding
      return [
        basePadding,
        basePadding,
        Math.max(basePadding, controlsSize.value.height + 20),
        basePadding,
      ];
    }

    // For Points and Polygons, use the centroid approach
    const [minLng, minLat, maxLng, maxLat] = bbox(geometry);
    const extent = transformExtent(
      [minLng, minLat, maxLng, maxLat],
      "EPSG:4326",
      "EPSG:3857"
    );

    // Get the bounding box center in pixel coordinates
    const centerCoord = [
      (extent[0]! + extent[2]!) / 2,
      (extent[1]! + extent[3]!) / 2,
    ];
    const centerPixel = view.getResolution()
      ? mapRef.value.map.getPixelFromCoordinate(centerCoord)
      : null;

    if (!centerPixel || mapHeight.value === 0 || mapWidth.value === 0) {
      // Fallback to default padding
      return [
        basePadding,
        basePadding,
        Math.max(basePadding, controlsSize.value.height + 20),
        basePadding,
      ];
    }

    const centerX = centerPixel[0] ?? 0;
    const centerY = centerPixel[1] ?? 0;

    // Calculate available space in each direction from map center
    const spaceTop = centerY;
    const spaceRight = mapWidth.value - centerX;

    // Determine if geometry center is above, below, left, or right of controls
    const isAboveControls = centerY < mapHeight.value - controlsHeight;
    const isRightOfControls = centerX > controlsWidth;

    const topPadding = basePadding;
    const rightPadding = basePadding;
    let bottomPadding = basePadding;
    let leftPadding = basePadding;

    // Strategy 1: Geometry is above controls - controls won't block much
    if (isAboveControls) {
      // Geometry is high up, controls at bottom won't interfere much
      bottomPadding = Math.max(basePadding, controlsHeight + 20);
      leftPadding = basePadding;
    }
    // Strategy 2: Geometry is to the right of controls
    else if (isRightOfControls) {
      // Geometry is on the right side, controls on left won't interfere much
      bottomPadding = Math.max(basePadding, controlsHeight + 20);
      leftPadding = basePadding;
    }
    // Strategy 3: Geometry overlaps with controls area - need to be smart
    else {
      // Geometry is in the bottom-left where controls are
      // Check if there's more space above or to the right

      const spaceAboveControls = spaceTop;
      const spaceRightOfControls = spaceRight;

      if (spaceAboveControls > spaceRightOfControls) {
        // More space above - push geometry up by adding bottom padding
        bottomPadding = Math.max(basePadding, controlsHeight + 40);
        leftPadding = basePadding;
      } else {
        // More space to the right - push geometry right by adding left padding
        leftPadding = Math.max(basePadding, controlsWidth + 40);
        bottomPadding = Math.max(basePadding, controlsHeight + 20);
      }
    }

    return [topPadding, rightPadding, bottomPadding, leftPadding];
  }

  /**
   * Update padding based on current selected issue geometry
   */
  function updatePadding(geometry: Geometry | null | undefined) {
    if (!geometry) {
      // Clear any pending debounce
      if (paddingDebounceTimer) {
        clearTimeout(paddingDebounceTimer);
        paddingDebounceTimer = null;
      }

      // Reset to default when no geometry
      currentPadding.value = [
        basePadding,
        basePadding,
        basePadding,
        basePadding,
      ];
      lastGeometry.value = null;
      return;
    }

    const newPadding = calculatePadding(geometry);

    // Only update if padding actually changed
    const hasChanged = newPadding.some(
      (val, idx) => val !== currentPadding.value[idx]
    );

    if (hasChanged) {
      console.debug("[useAdaptivePadding] padding calculated (debouncing)", {
        old: currentPadding.value,
        new: newPadding,
      });

      // Clear previous debounce timer
      if (paddingDebounceTimer) {
        clearTimeout(paddingDebounceTimer);
      }

      // Debounce: only update currentPadding after changes have stabilized
      paddingDebounceTimer = setTimeout(() => {
        currentPadding.value = newPadding;
        console.debug("[useAdaptivePadding] padding ref updated (stable)", {
          padding: newPadding,
        });
        paddingDebounceTimer = null;
      }, PADDING_DEBOUNCE_MS);
    }

    lastGeometry.value = geometry;
  }

  // Watch for controls size changes and recalculate padding
  watch(
    controlsSize,
    () => {
      console.debug("[useAdaptivePadding] controlsSize changed", {
        size: controlsSize.value,
        hasGeometry: !!lastGeometry.value,
      });

      // Recalculate padding if we have a geometry
      if (lastGeometry.value) {
        updatePadding(lastGeometry.value);
      }
    },
    { deep: true }
  );

  // Watch for selected issue changes
  watch(
    selectedIssue,
    (issue) => {
      const geometry = issue?.geometry as Geometry | undefined;
      updatePadding(geometry);
    },
    { deep: true, immediate: true }
  );

  return {
    currentPadding,
    calculatePadding,
    updatePadding,
  };
}

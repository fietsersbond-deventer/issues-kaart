import type { Map as OLMap } from "ol";
import type { Ref } from "vue";
import { transform, transformExtent } from "ol/proj";
import centroid from "@turf/centroid";
import bbox from "@turf/bbox";
import type { Geometry } from "geojson";

export function useMapResize(
  mapRef: Ref<{ map?: OLMap } | null | undefined>,
  padding: Ref<[number, number, number, number]>,
  calculatePadding?: (
    geometry: Geometry | null | undefined
  ) => [number, number, number, number]
) {
  const { issue: selectedIssue } = storeToRefs(useSelectedIssue());

  // Get the global shared map size state
  const { mapWidth, mapHeight } = useMapSize();

  console.debug("[useMapResize] initialized", {
    hasMap: !!mapRef.value?.map,
    hasSelectedIssue: !!selectedIssue.value,
    selectedIssueId: selectedIssue.value?.id,
  });

  function recenterOnSelectedIssue() {
    console.debug("[useMapResize] recenterOnSelectedIssue called", {
      hasGeometry: !!selectedIssue.value?.geometry,
      hasMap: !!mapRef.value?.map,
      issueId: selectedIssue.value?.id,
      mapWidth: mapWidth.value,
      mapHeight: mapHeight.value,
    });

    if (!selectedIssue.value?.geometry || !mapRef.value?.map) return;

    // Skip if map size is not yet known (will be triggered again by mapSize watcher)
    if (calculatePadding && (mapWidth.value === 0 || mapHeight.value === 0)) {
      console.debug("[useMapResize] skipping - map size not yet known");
      return;
    }

    const geometry = selectedIssue.value.geometry as Geometry;

    // Calculate adaptive padding BEFORE zooming if function is provided
    if (calculatePadding) {
      const newPadding = calculatePadding(geometry);
      console.debug("[useMapResize] calculated padding", {
        newPadding,
        oldPadding: padding.value,
      });
      padding.value = newPadding;
    }

    const view = mapRef.value.map.getView();

    console.debug("[useMapResize] zooming to issue", {
      geometryType: geometry.type,
      issueId: selectedIssue.value.id,
      padding: padding.value,
    });

    // For points, zoom to a specific level
    if (geometry.type === "Point") {
      // Use Turf to calculate the centroid
      const centerPoint = centroid(geometry);

      // Transform from EPSG:4326 (GeoJSON) to EPSG:3857 (map projection)
      const center = transform(
        centerPoint.geometry.coordinates,
        "EPSG:4326",
        "EPSG:3857"
      );

      const currentZoom = view.getZoom() || 13;
      const targetZoom = Math.max(currentZoom, 15); // Zoom to at least level 15

      view.animate({
        center,
        zoom: targetZoom,
        duration: 600,
      });
    } else {
      // For LineStrings and Polygons, fit to bounding box with margin
      const [minLng, minLat, maxLng, maxLat] = bbox(geometry);

      // Transform bbox from EPSG:4326 to EPSG:3857
      const extent = transformExtent(
        [minLng, minLat, maxLng, maxLat],
        "EPSG:4326",
        "EPSG:3857"
      );

      console.debug("[useMapResize] calling view.fit", {
        extent,
        padding: padding.value,
        geometryType: geometry.type,
      });

      view.fit(extent, {
        padding: padding.value,
        duration: 600,
        maxZoom: 17, // Don't zoom in too close
      });

      console.debug("[useMapResize] view.fit called successfully");
    }
  }

  // Watch for selected issue changes and recenter
  watch(
    selectedIssue,
    (newIssue) => {
      console.debug("[useMapResize] selectedIssue watcher triggered", {
        issueId: newIssue?.id,
        hasGeometry: !!newIssue?.geometry,
        hasMap: !!mapRef.value?.map,
      });
      recenterOnSelectedIssue();
    },
    { deep: true, immediate: true }
  );

  // Also watch for map becoming available (for initial load when issue is already selected)
  watch(
    () => mapRef.value?.map,
    (map) => {
      console.debug("[useMapResize] map watcher triggered", {
        hasMap: !!map,
        hasSelectedIssue: !!selectedIssue.value?.geometry,
        issueId: selectedIssue.value?.id,
      });
      if (map && selectedIssue.value?.geometry) {
        recenterOnSelectedIssue();
      }
    }
  );

  // Watch for map size becoming available (triggers recenter with correct adaptive padding)
  if (mapWidth && mapHeight) {
    watch([mapWidth, mapHeight], ([width, height]) => {
      console.debug("[useMapResize] mapSize watcher triggered", {
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
        recenterOnSelectedIssue();
      }
    });
  }

  return {
    recenterOnSelectedIssue,
  };
}

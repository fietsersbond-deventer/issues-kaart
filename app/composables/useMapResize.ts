import type { Map as OLMap } from "ol";
import type { Ref } from "vue";
import { transform, transformExtent } from "ol/proj";
import centroid from "@turf/centroid";
import bbox from "@turf/bbox";
import type { Geometry } from "geojson";

export function useMapResize(
  mapRef: Ref<{ map?: OLMap } | null | undefined>,
  padding: Ref<[number, number, number, number]>
) {
  const { issue: selectedIssue } = storeToRefs(useSelectedIssue());

  function recenterOnSelectedIssue() {
    if (!selectedIssue.value?.geometry || !mapRef.value?.map) return;

    const geometry = selectedIssue.value.geometry as Geometry;
    const view = mapRef.value.map.getView();

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

      view.fit(extent, {
        padding: padding.value,
        duration: 600,
        maxZoom: 17, // Don't zoom in too close
      });
    }
  }

  // Watch for selected issue changes and recenter
  watch(
    selectedIssue,
    () => {
      recenterOnSelectedIssue();
    },
    { deep: true }
  );

  watch(
    padding,
    () => {
      recenterOnSelectedIssue();
    },
    { deep: true }
  );

  return {
    recenterOnSelectedIssue,
  };
}

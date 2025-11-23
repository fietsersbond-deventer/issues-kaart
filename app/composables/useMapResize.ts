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
  const targetCenter = ref<number[] | null>(null);
  const targetGeometry = ref<Geometry | null>(null);

  function recenterOnSelectedIssue() {
    if (!selectedIssue.value?.geometry) return;

    const geometry = selectedIssue.value.geometry as Geometry;
    targetGeometry.value = geometry;

    // Use Turf to calculate the centroid
    const centerPoint = centroid(geometry);

    // Transform from EPSG:4326 (GeoJSON) to EPSG:3857 (map projection)
    const newCenter = transform(
      centerPoint.geometry.coordinates,
      "EPSG:4326",
      "EPSG:3857"
    );

    // Store the target center to trigger animation
    targetCenter.value = newCenter;
  }

  // Watch for target center changes and animate to it
  watch(
    targetCenter,
    (newTarget) => {
      if (!newTarget || !mapRef.value?.map || !targetGeometry.value) return;

      const view = mapRef.value.map.getView();
      const geometry = targetGeometry.value;

      // For points, zoom to a specific level
      if (geometry.type === "Point") {
        const currentZoom = view.getZoom() || 13;
        const targetZoom = Math.max(currentZoom, 15); // Zoom to at least level 15

        view.animate({
          center: newTarget,
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
    },
    { immediate: true }
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

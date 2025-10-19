import type { Map as OLMap } from "ol";
import type { Ref } from "vue";
import { transform, transformExtent } from "ol/proj";
import centroid from "@turf/centroid";
import bbox from "@turf/bbox";
import type { Geometry } from "geojson";

export function useMapResize(mapRef: Ref<{ map?: OLMap } | null | undefined>) {
  const { issue: selectedIssue } = storeToRefs(useSelectedIssue());
  const mapHeight = ref(0);
  const mapWidth = ref(0);
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
          duration: 400,
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
          padding: [50, 50, 50, 50], // Add 50px margin on all sides
          duration: 400,
          maxZoom: 17, // Don't zoom in too close
        });
      }
    },
    { immediate: true }
  );

  let resizeObserver: ResizeObserver | null = null;

  // Setup resize observer on mount
  onMounted(() => {
    nextTick(() => {
      const mapComponent = unref(mapRef);
      if (!mapComponent) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapContainer = (mapComponent as any).$el as HTMLElement;
      if (!mapContainer) return;

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          mapHeight.value = entry.contentRect.height;
          mapWidth.value = entry.contentRect.width;
        }

        if (mapRef.value?.map) {
          mapRef.value.map.updateSize();

          if (selectedIssue.value?.geometry) {
            recenterOnSelectedIssue();
          }
        }
      });

      resizeObserver.observe(mapContainer);
    });
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  return {
    mapHeight,
    mapWidth,
    recenterOnSelectedIssue,
  };
}

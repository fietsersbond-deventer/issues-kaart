import type { Map as OLMap } from "ol";
import type { Ref } from "vue";
import { transform } from "ol/proj";
import { GeoJSON } from "ol/format";

export function useMapResize(mapRef: Ref<{ map?: OLMap } | null | undefined>) {
  const { issue: selectedIssue } = storeToRefs(useSelectedIssue());
  const mapHeight = ref(0);
  const mapWidth = ref(0);

  async function recenterOnSelectedIssue() {
    if (!mapRef.value?.map || !selectedIssue.value?.geometry) return;

    const mapView = mapRef.value.map.getView();
    const geometry = selectedIssue.value.geometry;

    // Small delay to ensure resize is complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (geometry.type === "Point") {
      // Center on point
      const center = transform(geometry.coordinates, "EPSG:4326", "EPSG:3857");
      mapView.animate({
        center,
        duration: 300,
      });
    } else if (geometry.type === "LineString" || geometry.type === "Polygon") {
      // Fit to extent
      const format = new GeoJSON();
      const feature = format.readFeature(
        { type: "Feature", geometry, properties: {} },
        { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" }
      );

      if (Array.isArray(feature)) return;

      const geom = feature.getGeometry();
      if (geom) {
        const extent = geom.getExtent();
        mapView.fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 300,
        });
      }
    }
  }

  function setupResizeObserver() {
    if (!mapRef.value?.map) return;

    const mapContainer = mapRef.value.map.getTargetElement();
    if (!mapContainer) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        mapHeight.value = entry.contentRect.height;
        mapWidth.value = entry.contentRect.width;
      }

      if (mapRef.value?.map) {
        mapRef.value.map.updateSize();

        // Recenter on selected issue if any
        if (selectedIssue.value?.geometry) {
          recenterOnSelectedIssue();
        }
      }
    });

    resizeObserver.observe(mapContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }

  return {
    mapHeight: readonly(mapHeight),
    mapWidth: readonly(mapWidth),
    recenterOnSelectedIssue,
    setupResizeObserver,
  };
}

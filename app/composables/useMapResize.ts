import type { Map as OLMap } from "ol";
import type { Ref } from "vue";
import { transform, transformExtent } from "ol/proj";
import { easeOut } from "ol/easing";
import bbox from "@turf/bbox";
import type { Geometry } from "geojson";

export function useMapResize(
  mapRef: Ref<{ map?: OLMap } | null | undefined>,
  padding: Ref<[number, number, number, number]>,
  onResize: () => void = () => {},
) {
  const log = (event: string, details: Record<string, unknown> = {}) => {
    console.debug(`[map-camera] ${event}`, details);
  };
  const { issue: selectedIssue, selectedId } = storeToRefs(useSelectedIssue());
  const mapHeight = ref(0);
  const mapWidth = ref(0);

  function recenterOnSelectedIssue() {
    if (!selectedIssue.value?.geometry) return;

    const issueId = "id" in selectedIssue.value ? selectedIssue.value.id : null;
    if (selectedId.value !== issueId) {
      log("recenter skipped: stale selected issue", {
        selectedId: selectedId.value,
        issueId,
      });
      return;
    }

    const geometry = selectedIssue.value.geometry as Geometry;

    const view = mapRef.value?.map?.getView();
    if (!view) {
      log("select/resize skipped: view unavailable");
      return;
    }

    log("recenter issue", {
      issueId:
        selectedIssue.value && "id" in selectedIssue.value
          ? selectedIssue.value.id
          : null,
      geometryType: geometry.type,
      currentZoom: view.getZoom(),
    });

    // For points, zoom to a specific level
    if (geometry.type === "Point") {
      const newTarget = transform(
        geometry.coordinates,
        "EPSG:4326",
        "EPSG:3857",
      );
      view.cancelAnimations();
      const currentZoom = view.getZoom() || 13;
      const targetZoom = Math.max(currentZoom, 15);

      view.animate({
        center: newTarget,
        zoom: targetZoom,
        duration: 1000,
        easing: easeOut,
      });
    } else {
      const [minLng, minLat, maxLng, maxLat] = bbox(geometry);

      const extent = transformExtent(
        [minLng, minLat, maxLng, maxLat],
        "EPSG:4326",
        "EPSG:3857",
      );

      view.cancelAnimations();
      view.fit(extent, {
        padding: padding.value,
        duration: 600,
        maxZoom: 17,
      });
    }
  }

  let resizeObserver: ResizeObserver | null = null;

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
          log("map resized", {
            width: mapWidth.value,
            height: mapHeight.value,
          });
          mapRef.value.map.updateSize();
          onResize();
        }
      });

      resizeObserver.observe(mapContainer);
    });
  });

  watch(
    padding,
    () => {
      log("padding changed", { padding: padding.value });
      onResize();
    },
    { deep: true },
  );

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

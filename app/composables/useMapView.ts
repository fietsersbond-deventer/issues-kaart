import type { Map } from "ol";
import type { Ref } from "vue";

export interface MapViewState {
  center: [number, number];
  zoom: number;
  rotation: number;
}

/**
 * Composable to track and share map view state (center, zoom, rotation)
 * @param mapRef - Template ref to the ol-map component
 */
export function useMapView(mapRef?: Ref<{ map: Map } | null>) {
  const center = ref<[number, number]>([687858.9021986299, 6846820.48790154]);
  const zoom = ref(13);
  const rotation = ref(0);

  // Try to get map from injection first, then from mapRef parameter
  let olMap = inject<Map | null>("map", null);

  const setupMapViewTracking = (map: Map) => {
    const view = map.getView();

    if (!view) {
      console.warn("View not available from map");
      return;
    }

    // Set initial values
    const initialCenter = view.getCenter();
    const initialZoom = view.getZoom();
    const initialRotation = view.getRotation();

    if (initialCenter) center.value = initialCenter as [number, number];
    if (initialZoom !== undefined) zoom.value = initialZoom;
    if (initialRotation !== undefined) rotation.value = initialRotation;

    // Add listener for view changes (pan, zoom, rotate)
    view.on(["change:center", "change:resolution", "change:rotation"], () => {
      const newCenter = view.getCenter();
      const newZoom = view.getZoom();
      const newRotation = view.getRotation();

      if (newCenter) center.value = newCenter as [number, number];
      if (newZoom !== undefined) zoom.value = newZoom;
      if (newRotation !== undefined) rotation.value = newRotation;
    });

    // Don't allow rotation changes
    watch(rotation, () => {
      view.setRotation(0);
    });
  };

  onMounted(() => {
    // If injection didn't work, try to get map from mapRef
    if (!olMap && mapRef?.value?.map) {
      olMap = mapRef.value.map;
    }

    if (!olMap) {
      console.warn("OpenLayers Map not found in component");
      return;
    }

    setupMapViewTracking(olMap);
  });

  // Also watch mapRef in case it becomes available later
  if (mapRef) {
    watch(
      mapRef,
      (newMapRef) => {
        if (newMapRef?.map && !olMap) {
          olMap = newMapRef.map;
          setupMapViewTracking(olMap);
        }
      },
      { immediate: true }
    );
  }

  return {
    center,
    zoom,
    rotation,
  };
}

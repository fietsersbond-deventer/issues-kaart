import type { Map } from "ol";
import type { Ref } from "vue";
import { useThrottleFn } from "@vueuse/core";

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

    // Separate listeners for different types of changes
    const updateCenter = useThrottleFn(() => {
      const newCenter = view.getCenter();
      if (newCenter) center.value = newCenter as [number, number];
    }, 16); // Throttle center updates (frequent during panning)

    const updateZoom = () => {
      const newZoom = view.getZoom();
      if (newZoom !== undefined) zoom.value = newZoom;
    }; // No throttling for zoom - immediate updates for responsive icon scaling

    const updateRotation = () => {
      const newRotation = view.getRotation();
      if (newRotation !== undefined) rotation.value = newRotation;
    };

    view.on("change:center", updateCenter);
    view.on("change:resolution", updateZoom);
    view.on("change:rotation", updateRotation);

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

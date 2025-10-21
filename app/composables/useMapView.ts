import { onMounted, ref, watch, type Ref } from "vue";
import type { Map } from "ol";

export interface MapViewState {
  center: [number, number];
  zoom: number;
  rotation: number;
}

/**
 * Composable to track and share map view state (center, zoom, rotation)
 * @param mapRef - Template ref to the ol-map component
 */
export function useMapView(mapRef: Ref<unknown>) {
  const center = ref<[number, number]>([687858.9021986299, 6846820.48790154]);
  const zoom = ref(13);
  const rotation = ref(0);

  onMounted(() => {
    watch(
      mapRef,
      (mapComponent) => {
        if (!mapComponent) return;

        const component = mapComponent as Record<string, unknown>;
        const olMap = component.map as Map;

        if (!olMap) {
          console.warn("OpenLayers Map not found in component");
          return;
        }

        const view = olMap.getView();

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
      },
      { immediate: true }
    );
  });

  return {
    center,
    zoom,
    rotation,
  };
}

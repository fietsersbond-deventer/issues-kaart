import { useSessionStorage } from "@vueuse/core";
import type TileLayer from "ol/layer/Tile";

type LayerName = "Licht" | "Fiets" | "Foto";

export function useMapLayerPreference() {
  // Layer preference stored in sessionStorage
  const preferredLayer = useSessionStorage<LayerName>(
    "preferred-map-layer",
    "Licht"
  );

  /**
   * Sets up a watcher for a layer to update the preferred layer when it becomes visible
   * @param layerRef - Template ref to the layer component
   * @param layerName - Name of the layer
   */
  function watchLayerVisibility(
    layerRef: Ref<{ tileLayer?: TileLayer; layer?: TileLayer } | null>,
    layerName: LayerName
  ): void {
    watch(layerRef, (layerComponent) => {
      const layer = layerComponent?.tileLayer || layerComponent?.layer;
      if (layer) {

        layer.on("change:visible", () => {
          if (layer.getVisible()) {
            preferredLayer.value = layerName;
          }
        });
      }
    });
  }

  return {
    preferredLayer,
    watchLayerVisibility,
  };
}

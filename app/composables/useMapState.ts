import type { View } from "ol";
import type { Coordinate } from "ol/coordinate";

export function useMapState() {
  const center = useState<Coordinate>("map-bounds", () => [
    6.04574203491211, 52.229059859924256,
  ]);

  const zoom = useState<number>("map-zoom", () => 10);

  const projection = useState<string>("map-projection", () => "EPSG:4326");

  const viewRef = ref<{ view: View } | null>(null);

  return {
    center,
    zoom,
    projection,
    viewRef,
  };
}

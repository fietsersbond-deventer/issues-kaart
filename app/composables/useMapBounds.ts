import type { IBoundsTuples } from "~/types/IBounds";

export function useMapBounds() {
  const bounds = useState<IBoundsTuples>("map-bounds", () => [
    [52.229059859924256, 6.04574203491211],
    [52.30207457819167, 6.30941390991211],
  ]);

  return {
    bounds,
  };
}

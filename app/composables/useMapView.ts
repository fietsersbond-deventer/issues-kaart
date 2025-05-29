import type { Map } from "ol";
import { View } from "ol";

const view = new View({
  center: [6.04574203491211, 52.229059859924256],
  zoom: 13,
  projection: "EPSG:4326",
});

export function useMapView() {
  return {
    view,
  };
}

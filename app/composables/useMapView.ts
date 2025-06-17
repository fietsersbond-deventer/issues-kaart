import { View } from "ol";

export function useMapView() {
  const config = useRuntimeConfig().public;
  
  const view = new View({
    center: [
      (config.locationBounds.west + config.locationBounds.east) / 2,
      (config.locationBounds.south + config.locationBounds.north) / 2
    ],
    zoom: 13,
    projection: "EPSG:4326",
  });

  return {
    view,
  };
}

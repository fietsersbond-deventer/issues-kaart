import { View } from "ol";

export function useMapView() {
  const config = useRuntimeConfig().public;
  const bounds = parseLocationBounds(config);
  const center = calculateCenterFromBounds(bounds);

  const view = new View({
    center: [center.lon, center.lat],
    zoom: 13,
    projection: "EPSG:4326",
  });

  return {
    view,
    bounds,
    center,
  };
}

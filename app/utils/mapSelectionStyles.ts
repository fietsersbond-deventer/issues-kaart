import type { Feature } from "ol";
import { Style, Stroke, Circle, Fill } from "ol/style";
import { Point, LineString, Polygon, MultiPoint } from "ol/geom";

export function mapSelectionStyles(feature: Feature, editing: boolean, pointRadius = 15): Style[] {
  const geometry = feature.getGeometry();
  if (!geometry) return [];
  const color = editing ? "#1565c0" : "#a65f00";
  const outline = new Style({
    stroke: new Stroke({ color, width: geometry instanceof LineString ? 12 : 7 }),
    image: new Circle({
      radius: pointRadius,
      stroke: new Stroke({ color, width: 4 }),
    }),
    zIndex: 999,
  });
  if (!editing) return [outline];

  const coordinates = geometry instanceof Point ? [geometry.getCoordinates()]
    : geometry instanceof LineString ? geometry.getCoordinates()
      : geometry instanceof Polygon ? geometry.getCoordinates().flatMap(ring => ring.slice(0, -1))
        : [];
  return [outline, new Style({
    geometry: new MultiPoint(coordinates),
    image: new Circle({
      radius: 5,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "#ffffff", width: 2 }),
    }),
    zIndex: 1002,
  })];
}

import { describe, expect, it } from "vitest";
import Feature from "ol/Feature";
import { Point, LineString, Polygon, MultiPoint } from "ol/geom";
import type { Circle } from "ol/style";
import { mapSelectionStyles } from "../app/utils/mapSelectionStyles";

describe("zichtbare kaartselectie", () => {
  it.each([
    new Point([1, 2]),
    new LineString([[1, 2], [3, 4]]),
    new Polygon([[[1, 2], [3, 4], [5, 6], [1, 2]]]),
  ])("gebruikt een amberkleurige selectie en blauwe bewerkpunten voor %s", geometry => {
    const feature = new Feature(geometry);
    const originalCoordinates = structuredClone(geometry.getCoordinates());
    const selection = mapSelectionStyles(feature, false);
    expect(selection[0]?.getStroke()?.getColor()).toBe("#a65f00");
    const editing = mapSelectionStyles(feature, true);
    const handles = editing.at(-1)!;
    expect((handles.getImage() as Circle).getFill()?.getColor()).toBe("#1565c0");
    const vertices = handles.getGeometryFunction()(feature) as MultiPoint;
    expect(vertices?.getType()).toBe("MultiPoint");
    expect(vertices?.getCoordinates()).toEqual(
      geometry instanceof Point ? [[1, 2]]
        : geometry instanceof LineString ? [[1, 2], [3, 4]]
          : [[1, 2], [3, 4], [5, 6]],
    );
    expect(geometry.getCoordinates()).toEqual(originalCoordinates);
  });

  it("tekent niets voor een feature zonder geometrie", () => {
    expect(mapSelectionStyles(new Feature(), true)).toEqual([]);
  });

  it("toont ook de hoekpunten van gaten zonder dubbele sluitpunten", () => {
    const polygon = new Polygon([
      [[0, 0], [10, 0], [10, 10], [0, 0]],
      [[2, 2], [3, 2], [3, 3], [2, 2]],
    ]);
    const handles = mapSelectionStyles(new Feature(polygon), true).at(-1)!;
    const vertices = handles.getGeometry() as MultiPoint;
    expect(vertices.getCoordinates()).toEqual([[0, 0], [10, 0], [10, 10], [2, 2], [3, 2], [3, 3]]);
  });
});

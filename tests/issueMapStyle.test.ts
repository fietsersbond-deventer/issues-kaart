// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Feature } from "ol";
import { Point, LineString, Polygon } from "ol/geom";
import type { Circle, Icon, Style } from "ol/style";
import type { NewIssue } from "../shared/types/Issue";
import { getIssueMapStyle } from "../app/utils/issueMapStyle";

const point = new Feature(new Point([0, 0]));
const line = new Feature(new LineString([[0, 0], [1, 1]]));
const polygon = new Feature(new Polygon([[[0, 0], [1, 0], [0, 0]]]));
function issue(icon?: string, iconData?: string, color = "#123456"): NewIssue {
  return {
    title: "Onderwerp", description: "", tags: [],
    legend: { id: 1, name: "Categorie", description: "", created_at: "2026-01-01", color, icon, icon_data_url: iconData },
  };
}
function styles(feature: Feature, item: NewIssue | undefined, selected = false, zoom = 14): Style[] {
  const result = getIssueMapStyle(feature, item, selected, zoom);
  return result ? (Array.isArray(result) ? result : [result]) : [];
}
const imageData = "data:image/png;base64,aGVsbG8=";

describe("getIssueMapStyle", () => {
  it("geeft geen stijl terug zonder onderwerp", () => {
    expect(getIssueMapStyle(point, undefined, false, 14)).toBeUndefined();
  });

  it.each([false, true])("tekent een punt zonder icoon, geselecteerd=%s", selected => {
    const result = styles(point, issue(), selected);
    expect(result).toHaveLength(1);
    const circle = result[0]!.getImage() as Circle;
    expect(circle.getRadius()).toBe(8);
    expect(circle.getFill()!.getColor()).toBe("#123456");
    expect(circle.getStroke()!.getColor()).toBe(selected ? "black" : "white");
    expect(circle.getStroke()!.getWidth()).toBe(2);
    expect(result[0]!.getZIndex()).toBe(selected ? 1000 : 1);
  });

  it.each([
    [8, 0.3, 10.6], [10, 0.3, 10.6], [14, 0.5, 17], [18, 0.7, 23.4], [20, 0.7, 23.4],
  ])("schaalt icoon bij zoom %s met schaal %s", (zoom, scale, radius) => {
    const item = issue("mdi-bike", imageData);
    const normal = styles(point, item, false, zoom);
    expect(normal).toHaveLength(1);
    const icon = normal[0]!.getImage() as Icon;
    expect(icon.getSrc()).toBe(imageData);
    expect(icon.getScale()).toBeCloseTo(scale);
    const selected = styles(point, item, true, zoom);
    expect(selected.map(s => s.getZIndex())).toEqual([1000, 1001]);
    const border = selected[1]!.getImage() as Circle;
    expect(border.getRadius()).toBeCloseTo(radius);
    expect(border.getStroke()!.getColor()).toBe("black");
    expect(border.getStroke()!.getWidth()).toBe(3);
    expect(border.getFill()!.getColor()).toBe("transparent");
  });

  it.each([[8, 3, 5], [10, 3, 6], [14, 5, 8], [18, 7, 10], [20, 7, 11]])(
    "behoudt fallbackcirkel en de onbegrensde selectierand bij zoom %s", (zoom, radius, borderRadius) => {
      const item = issue("mdi-bike");
      const normal = styles(point, item, false, zoom);
      expect(normal).toHaveLength(1);
      const circle = normal[0]!.getImage() as Circle;
      expect(circle.getRadius()).toBe(radius);
      expect(circle.getFill()!.getColor()).toBe("#123456");
      expect(circle.getStroke()!.getColor()).toBe("white");
      expect(circle.getStroke()!.getWidth()).toBeCloseTo(Math.max(1, radius / 6));
      const selected = styles(point, item, true, zoom);
      expect(selected.map(s => s.getZIndex())).toEqual([1000, 1001]);
      expect((selected[1]!.getImage() as Circle).getRadius()).toBe(borderRadius);
    },
  );

  it("gebruikt blauw als een icooncategorie geen kleur heeft", () => {
    const circle = styles(point, issue("mdi-bike", undefined, ""))[0]!.getImage() as Circle;
    expect(circle.getFill()!.getColor()).toBe("#2196F3");
  });

  it.each([false, true])("behoudt lijnbreedtes en tekenvolgorde, geselecteerd=%s", selected => {
    const result = styles(line, issue(), selected);
    expect(result.map(s => s.getStroke()!.getWidth())).toEqual(selected ? [8, 6] : [3]);
    expect(result.map(s => s.getStroke()!.getColor())).toEqual(selected ? ["black", "#123456"] : ["#123456"]);
    expect(result.map(s => s.getZIndex())).toEqual(selected ? [1000, 1001] : [1]);
  });

  it.each([false, true])("behoudt polygonvulling en rand, geselecteerd=%s", selected => {
    const result = styles(polygon, issue(), selected)[0]!;
    expect(result.getStroke()!.getColor()).toBe(selected ? "black" : "#123456");
    expect(result.getStroke()!.getWidth()).toBe(2);
    expect(result.getFill()!.getColor()).toBe("rgba(18, 52, 86, 0.5)");
    expect(result.getZIndex()).toBe(selected ? 1000 : 1);
  });

  it("gebruikt zwart als polygonvulling zonder categorie of kleur", () => {
    const draft: NewIssue = { title: "Nieuw", description: "", tags: [] };
    expect(styles(polygon, draft)[0]!.getFill()!.getColor()).toBe("rgba(0, 0, 0, 0.5)");
    expect(styles(polygon, issue(undefined, undefined, ""))[0]!.getFill()!.getColor()).toBe("rgba(0, 0, 0, 0.5)");
    expect((styles(point, draft)[0]!.getImage() as Circle).getRadius()).toBe(8);
  });

  it("wijzigt het onderwerp niet en gebruikt de expliciete selectie en zoom", () => {
    const item = issue("mdi-bike", imageData);
    const before = structuredClone(item);
    expect(styles(point, item, false, 10)[0]!.getZIndex()).toBe(1);
    expect(styles(point, item, true, 18)[0]!.getZIndex()).toBe(1000);
    expect(item).toEqual(before);
  });
});

it("shares styles across 27000 features and invalidates changed category colours", async () => {
  const { createIssueMapStyleCache } = await import("../app/utils/issueMapStyle");
  const cached = createIssueMapStyleCache();
  const item = issue();
  const first = cached(line, item, false, 14);
  for (let i = 0; i < 27000; i++) expect(cached(line, item, false, 14)).toBe(first);
  item.legend!.color = "#ff0000";
  const changed = cached(line, item, false, 14);
  expect(changed).not.toBe(first);
  expect((changed as Style).getStroke()!.getColor()).toBe("#ff0000");
  expect(cached(line, item, true, 14)).not.toBe(changed);
  expect(cached(line, undefined, false, 14)).toBeUndefined();
  item.legend!.icon = "mdi-bike";
  for (let zoom = 1; zoom <= 100; zoom++) cached(point, item, false, zoom);
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Feature } from "ol";
import { Point, LineString, Polygon } from "ol/geom";
import type { Circle, Icon, Style } from "ol/style";
import type { NewIssue } from "../shared/types/Issue";
import {
  getClusterMapStyle,
  getIssueMapStyle,
} from "../app/utils/issueMapStyle";
import {
  exportMapImage,
  renderIssueMapImages,
} from "../app/utils/renderIssueMapImages";

// A map that renders immediately, with one layer canvas at pixel ratio 2.
const mapInstances = vi.hoisted(() => [] as FakeMap[]);
type FakeMap = {
  options: Record<string, unknown>;
  fit: ReturnType<typeof import("vitest").vi.fn>;
  setTarget: ReturnType<typeof import("vitest").vi.fn>;
  viewport: HTMLElement;
};
vi.mock("ol/Map", () => ({
  default: class {
    options: Record<string, unknown>;
    fit = vi.fn();
    setTarget = vi.fn();
    viewport = document.createElement("div");
    private listener?: () => void;
    constructor(options: Record<string, unknown>) {
      this.options = options;
      const layer = document.createElement("div");
      layer.className = "ol-layer";
      layer.style.opacity = "0.5";
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.style.transform = "matrix(0.5, 0, 0, 0.5, 0, 0)";
      layer.append(canvas, document.createElement("canvas"));
      (layer.lastChild as HTMLCanvasElement).width = 0;
      this.viewport.append(layer);
      mapInstances.push(this as unknown as FakeMap);
    }
    getView() {
      return { fit: this.fit };
    }
    getSize() {
      return [320, 240];
    }
    getPixelRatio() {
      return 2;
    }
    getViewport() {
      return this.viewport;
    }
    once(_event: string, listener: () => void) {
      this.listener = listener;
    }
    render() {
      this.listener?.();
    }
  },
}));

const point = new Feature(new Point([0, 0]));
const line = new Feature(
  new LineString([
    [0, 0],
    [1, 1],
  ]),
);
const polygon = new Feature(
  new Polygon([
    [
      [0, 0],
      [1, 0],
      [0, 0],
    ],
  ]),
);
function issue(icon?: string, iconData?: string, color = "#123456"): NewIssue {
  return {
    title: "Onderwerp",
    description: "",
    tags: [],
    legend: {
      id: 1,
      name: "Categorie",
      description: "",
      created_at: "2026-01-01",
      color,
      icon,
      icon_data_url: iconData,
    },
  };
}
function styles(
  feature: Feature,
  item: NewIssue | undefined,
  selected = false,
  zoom = 14,
): Style[] {
  const result = getIssueMapStyle(feature, item, selected, zoom);
  return result ? (Array.isArray(result) ? result : [result]) : [];
}
const imageData = "data:image/png;base64,aGVsbG8=";

describe("getIssueMapStyle", () => {
  it("toont een cluster in de categoriekleur met een contrasterend aantal", () => {
    const result = getClusterMapStyle(12, "#123456");
    const circle = result.getImage() as Circle;
    expect(circle.getFill()!.getColor()).toBe("#123456");
    expect(circle.getStroke()!.getColor()).toBe("white");
    expect(result.getText()!.getText()).toBe("12");
    expect(result.getText()!.getFill()!.getColor()).toBe("#ffffff");
    expect(
      getClusterMapStyle(2, "#ffffff").getText()!.getFill()!.getColor(),
    ).toBe("#000000");
  });
  it("geeft geen stijl terug zonder onderwerp", () => {
    expect(getIssueMapStyle(point, undefined, false, 14)).toBeUndefined();
  });

  it.each([false, true])(
    "tekent een punt zonder icoon, geselecteerd=%s",
    (selected) => {
      const result = styles(point, issue(), selected);
      expect(result).toHaveLength(1);
      const circle = result[0]!.getImage() as Circle;
      expect(circle.getRadius()).toBe(8);
      expect(circle.getFill()!.getColor()).toBe("#123456");
      expect(circle.getStroke()!.getColor()).toBe(selected ? "black" : "white");
      expect(circle.getStroke()!.getWidth()).toBe(2);
      expect(result[0]!.getZIndex()).toBe(selected ? 1000 : 1);
    },
  );

  it.skip.each([
    [8, 0.1, 10.6],
    [10, 0.3, 10.6],
    [14, 0.5, 17],
    [18, 0.7, 23.4],
    [20, 0.7, 23.4],
  ])("schaalt icoon bij zoom %s met schaal %s", (zoom, scale, radius) => {
    const item = issue("mdi-bike", imageData);
    const normal = styles(point, item, false, zoom);
    expect(normal).toHaveLength(1);
    const icon = normal[0]!.getImage() as Icon;
    expect(icon.getSrc()).toBe(imageData);
    expect(icon.getScale()).toBeCloseTo(scale);
    const selected = styles(point, item, true, zoom);
    expect(selected.map((s) => s.getZIndex())).toEqual([1000, 1001]);
    const border = selected[1]!.getImage() as Circle;
    expect(border.getRadius()).toBeCloseTo(radius);
    expect(border.getStroke()!.getColor()).toBe("black");
    expect(border.getStroke()!.getWidth()).toBe(3);
    expect(border.getFill()!.getColor()).toBe("transparent");
  });

  it.each([
    [8, 3, 5],
    [10, 3, 6],
    [14, 5, 8],
    [18, 7, 10],
    [20, 7, 11],
  ])(
    "behoudt fallbackcirkel en de onbegrensde selectierand bij zoom %s",
    (zoom, radius, borderRadius) => {
      const item = issue("mdi-bike");
      const normal = styles(point, item, false, zoom);
      expect(normal).toHaveLength(1);
      const circle = normal[0]!.getImage() as Circle;
      expect(circle.getRadius()).toBe(radius);
      expect(circle.getFill()!.getColor()).toBe("#123456");
      expect(circle.getStroke()!.getColor()).toBe("white");
      expect(circle.getStroke()!.getWidth()).toBeCloseTo(
        Math.max(1, radius / 6),
      );
      const selected = styles(point, item, true, zoom);
      expect(selected.map((s) => s.getZIndex())).toEqual([1000, 1001]);
      expect((selected[1]!.getImage() as Circle).getRadius()).toBe(
        borderRadius,
      );
    },
  );

  it("gebruikt blauw als een icooncategorie geen kleur heeft", () => {
    const circle = styles(
      point,
      issue("mdi-bike", undefined, ""),
    )[0]!.getImage() as Circle;
    expect(circle.getFill()!.getColor()).toBe("#2196F3");
  });

  it.each([false, true])(
    "behoudt lijnbreedtes en tekenvolgorde, geselecteerd=%s",
    (selected) => {
      const result = styles(line, issue(), selected);
      expect(result.map((s) => s.getStroke()!.getWidth())).toEqual(
        selected ? [8, 6] : [3],
      );
      expect(result.map((s) => s.getStroke()!.getColor())).toEqual(
        selected ? ["black", "#123456"] : ["#123456"],
      );
      expect(result.map((s) => s.getZIndex())).toEqual(
        selected ? [1000, 1001] : [1],
      );
    },
  );

  it.each([false, true])(
    "behoudt polygonvulling en rand, geselecteerd=%s",
    (selected) => {
      const result = styles(polygon, issue(), selected)[0]!;
      expect(result.getStroke()!.getColor()).toBe(
        selected ? "black" : "#123456",
      );
      expect(result.getStroke()!.getWidth()).toBe(2);
      expect(result.getFill()!.getColor()).toBe("rgba(18, 52, 86, 0.5)");
      expect(result.getZIndex()).toBe(selected ? 1000 : 1);
    },
  );

  it("gebruikt zwart als polygonvulling zonder categorie of kleur", () => {
    const draft: NewIssue = { title: "Nieuw", description: "", tags: [] };
    expect(styles(polygon, draft)[0]!.getFill()!.getColor()).toBe(
      "rgba(0, 0, 0, 0.5)",
    );
    expect(
      styles(polygon, issue(undefined, undefined, ""))[0]!
        .getFill()!
        .getColor(),
    ).toBe("rgba(0, 0, 0, 0.5)");
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

describe("renderIssueMapImages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mapInstances.length = 0;
  });

  function fakeCanvas(toDataURL = () => "data:image/png;base64,map") {
    const context = {
      globalAlpha: 1,
      setTransform: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(
      toDataURL,
    );
    return context;
  }

  const printIssue = (id: number) => ({
    ...issue(),
    id,
    slug: `issue-${id}`,
    legend_id: 1,
    imageUrl: null,
    geometry: { type: "Point" as const, coordinates: [6.16, 52.25] },
  });

  it("renders one image per issue with a single, removed map", async () => {
    const context = fakeCanvas();
    const onImage = vi.fn();
    await renderIssueMapImages([printIssue(1), printIssue(2)], { onImage });
    expect(mapInstances).toHaveLength(1);
    const [map] = mapInstances;
    expect(map!.fit).toHaveBeenCalledTimes(2);
    expect(map!.fit.mock.calls[0]![1]).toMatchObject({ maxZoom: 16 });
    expect(onImage.mock.calls).toEqual([
      [1, "data:image/png;base64,map"],
      [2, "data:image/png;base64,map"],
    ]);
    // the layer canvas is scaled back to the pixel ratio, with its opacity
    expect(context.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.globalAlpha).toBe(0.5);
    expect(map!.setTarget).toHaveBeenCalledWith(undefined);
    expect(document.body.children).toHaveLength(0);
  });

  it("skips images that cannot be exported", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fakeCanvas(() => {
      throw new DOMException("Tainted canvas", "SecurityError");
    });
    const onImage = vi.fn();
    await renderIssueMapImages([printIssue(1)], { onImage });
    expect(onImage).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(exportMapImage(mapInstances[0] as never)).toBeNull();
    mapInstances[0]!.viewport.innerHTML = "";
    expect(exportMapImage(mapInstances[0] as never)).toBeNull();
  });
});

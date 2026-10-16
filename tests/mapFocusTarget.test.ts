import { describe, expect, it } from "vitest";
import type { Geometry } from "geojson";
import { focusKey, resolveFocusTarget } from "../app/utils/mapFocusTarget";

const area: [number, number, number, number] = [6, 52, 6.4, 52.4];
const point = (x: number, y: number): Geometry => ({
  type: "Point",
  coordinates: [x, y],
});

const base = {
  prefer: "issue" as const,
  areaBbox: area,
  selectedId: null,
  issue: null,
  filterActive: false,
  selectedIssues: [],
};

describe("resolveFocusTarget", () => {
  it("falls back to the area without issue or filter", () => {
    expect(resolveFocusTarget(base)?.type).toBe("area");
  });

  it("waits while the selected issue is still loading", () => {
    expect(
      resolveFocusTarget({ ...base, selectedId: 5, issue: { id: 4 } }),
    ).toBeUndefined();
  });

  it("zooms to the selected issue", () => {
    const target = resolveFocusTarget({
      ...base,
      selectedId: 5,
      issue: { id: 5, geometry: point(6.1, 52.1) },
    });
    expect(target).toMatchObject({ type: "issue", id: 5, isPoint: true });
  });

  it("uses the bbox of the selected issues for an active filter", () => {
    const target = resolveFocusTarget({
      ...base,
      filterActive: true,
      selectedIssues: [
        { geometry: point(6.1, 52.1) },
        { geometry: point(6.2, 52.3) },
      ],
    });
    expect(target).toEqual({ type: "filter", bbox: [6.1, 52.1, 6.2, 52.3] });
  });

  it("prefers the filter after a filter change, even with an issue selected", () => {
    const target = resolveFocusTarget({
      ...base,
      prefer: "filter",
      selectedId: 5,
      issue: { id: 5, geometry: point(6.1, 52.1) },
      filterActive: true,
      selectedIssues: [{ geometry: point(6.2, 52.3) }],
    });
    expect(target?.type).toBe("filter");
  });

  it("falls back to the area when the filter matches nothing", () => {
    expect(
      resolveFocusTarget({ ...base, filterActive: true })?.type,
    ).toBe("area");
  });
});

describe("focusKey", () => {
  it("is stable for the same bbox and differs per issue", () => {
    const a = { type: "issue" as const, id: 1, bbox: area, isPoint: false };
    expect(focusKey(a)).toBe(focusKey({ ...a }));
    expect(focusKey(a)).not.toBe(focusKey({ ...a, id: 2 }));
  });
});

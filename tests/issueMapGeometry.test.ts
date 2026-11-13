import { describe, expect, it } from "vitest";
import type { MapIssue, NewIssue } from "../shared/types/Issue";
import {
  getFeatureProperties,
  toPointCoords,
  toLineCoords,
  toPolygonCoords,
} from "../app/utils/issueMapGeometry";

const projected = [667916.9447596414, 6800125.454397307];
const draft: NewIssue = { title: "Nieuw", description: "", tags: [] };

function expectProjected(coordinate: number[]) {
  expect(coordinate[0]).toBeCloseTo(projected[0]!, 6);
  expect(coordinate[1]).toBeCloseTo(projected[1]!, 6);
}

describe("issueMapGeometry", () => {
  it("projecteert een punt zonder de GeoJSON-invoer te wijzigen", () => {
    const issue: NewIssue = { ...draft, geometry: { type: "Point", coordinates: [6, 52, 10] } };
    const before = structuredClone(issue);
    const result = toPointCoords(issue);
    expectProjected(result);
    expect(result[2]).toBe(10);
    expect(issue).toEqual(before);
  });

  it("projecteert elk punt van een lijn in dezelfde volgorde", () => {
    const issue: NewIssue = { ...draft, geometry: { type: "LineString", coordinates: [[0, 0], [6, 52]] } };
    const before = structuredClone(issue);
    const result = toLineCoords(issue);
    expect(result[0]![0]).toBeCloseTo(0);
    expect(result[0]![1]).toBeCloseTo(0);
    expectProjected(result[1]!);
    expect(issue).toEqual(before);
  });

  it("behoudt polygonringen, gaten en gesloten ringen", () => {
    const ring = [[6, 52], [6.1, 52], [6, 52.1], [6, 52]];
    const hole = [[6, 52], [6.01, 52], [6, 52.01], [6, 52]];
    const issue: NewIssue = { ...draft, geometry: { type: "Polygon", coordinates: [ring, hole] } };
    const before = structuredClone(issue);
    const result = toPolygonCoords(issue);
    expect(result.map(r => r.length)).toEqual([4, 4]);
    for (const projectedRing of result) {
      expectProjected(projectedRing[0]!);
      expect(projectedRing[0]).toEqual(projectedRing[3]);
    }
    expect(result[0]![1]).not.toEqual(result[1]![1]);
    expect(issue).toEqual(before);
  });

  it.each([undefined, null, { type: "LineString" as const, coordinates: [] }])(
    "gebruikt de bestaande puntfallback bij %j", geometry => {
      expect(toPointCoords({ ...draft, geometry })).toEqual([0, 0]);
    },
  );

  it.each([undefined, null, { type: "Point" as const, coordinates: [6, 52] }])(
    "gebruikt de bestaande lijn- en polygonfallback bij %j", geometry => {
      expect(toLineCoords({ ...draft, geometry })).toEqual([[0, 0]]);
      expect(toPolygonCoords({ ...draft, geometry })).toEqual([[[0, 0]]]);
    },
  );

  it("behoudt lege lijnen en polygonen", () => {
    expect(toLineCoords({ ...draft, geometry: { type: "LineString", coordinates: [] } })).toEqual([]);
    expect(toPolygonCoords({ ...draft, geometry: { type: "Polygon", coordinates: [] } })).toEqual([]);
  });

  it("laat alleen geometry weg uit bestaande feature-eigenschappen", () => {
    const issue: MapIssue = {
      id: 7, title: "Onderwerp", tags: ["veilig"], imageUrl: "/foto.jpg", legend_id: 2,
      legend: { id: 2, name: "Categorie", color: "red", description: "", created_at: "2026-01-01" },
      geometry: { type: "Point", coordinates: [6, 52] },
    };
    const before = structuredClone(issue);
    expect(getFeatureProperties(issue)).toEqual({
      id: 7, title: "Onderwerp", tags: ["veilig"], imageUrl: "/foto.jpg", legend_id: 2, legend: issue.legend,
    });
    expect(issue).toEqual(before);
    expect(getFeatureProperties(draft)).toEqual(draft);
  });
});

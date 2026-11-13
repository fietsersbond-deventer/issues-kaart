import { describe, expect, it } from "vitest";
import { tryCoordinateProviders } from "../app/utils/tryCoordinateProviders";

describe("tryCoordinateProviders", () => {
  it("recognises WGS84 latitude/longitude pairs", () => {
    const [result] = tryCoordinateProviders("52,25; 6,16")!;
    expect(result).toMatchObject({ lat: 52.25, lon: 6.16, type: "coordinate" });
  });

  it("converts Rijksdriehoek coordinates to WGS84", () => {
    const [result] = tryCoordinateProviders("200000 500000")!;
    expect(result!.lat).toBeGreaterThan(52);
    expect(result!.lat).toBeLessThan(53);
    expect(result!.lon).toBeGreaterThan(5);
    expect(result!.lon).toBeLessThan(7);
  });

  it("ignores text and out-of-range pairs", () => {
    expect(tryCoordinateProviders("Deventer")).toBeUndefined();
    expect(tryCoordinateProviders("10 20")).toBeUndefined();
  });
});

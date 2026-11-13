import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationIQSearchProvider } from "../app/utils/LocationIQSearchProvider";

const fetch = vi.fn();

beforeEach(() => {
  fetch.mockReset();
  vi.stubGlobal("$fetch", fetch);
  vi.stubGlobal("useRuntimeConfig", () => ({
    public: { locationiq: { apiKey: "test-key" } },
  }));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LocationIQSearchProvider", () => {
  it("requests bounded GeoJSON results and maps their geometry and bbox", async () => {
    fetch.mockResolvedValueOnce([
      {
        place_id: 123,
        osm_type: "way",
        osm_id: 456,
        name: "Grote Synagoge",
        display_name:
          "Grote Synagoge, Prinsenplaats, Bergkwartier, Binnenstad, Deventer, Overijssel, Nederland, 7411 BP, Nederland",
        lat: "52.2",
        lon: "6.1",
        boundingbox: ["52.1", "52.3", "6.0", "6.2"],
        class: "highway",
        type: "residential",
        geojson: {
          type: "LineString",
          coordinates: [
            [6.0, 52.1],
            [6.2, 52.3],
          ],
        },
      },
      {
        place_id: 789,
        display_name: "Park, Deventer, Nederland",
        lat: "52.3",
        lon: "6.2",
      },
    ]);

    const results = await LocationIQSearchProvider.search("Voorbeeldstraat", {
      bbox: { west: 6, south: 52, east: 7, north: 53 },
    });

    expect(fetch).toHaveBeenCalledWith("https://eu1.locationiq.com/v1/search", {
      query: expect.objectContaining({
        q: "Voorbeeldstraat",
        key: "test-key",
        polygon_geojson: "1",
        viewbox: "6,52,7,53",
        bounded: "1",
      }),
    });
    expect(results).toMatchObject([
      {
        id: "way_456",
        label: "Grote Synagoge, Prinsenplaats, Bergkwartier",
        lat: 52.2,
        lon: 6.1,
        boundingbox: { south: 52.1, west: 6, north: 52.3, east: 6.2 },
        geometry: {
          type: "LineString",
          coordinates: [
            [6, 52.1],
            [6.2, 52.3],
          ],
        },
        type: "straat",
      },
      {
        id: "789",
        label: "Park, Deventer, Nederland",
      },
    ]);
  });

  it("skips short searches without a key and ignores invalid coordinates", async () => {
    const runtimeConfig = vi.fn(() => ({
      public: { locationiq: { apiKey: "" } },
    }));
    vi.stubGlobal("useRuntimeConfig", runtimeConfig);

    expect(await LocationIQSearchProvider.search("a")).toEqual([]);
    expect(await LocationIQSearchProvider.search("straat")).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();

    vi.stubGlobal("useRuntimeConfig", () => ({
      public: { locationiq: { apiKey: "test-key" } },
    }));
    fetch.mockResolvedValueOnce([
      {
        place_id: 1,
        display_name: "Ongeldige locatie",
        lat: "nope",
        lon: "6",
      },
    ]);

    expect(await LocationIQSearchProvider.search("straat")).toEqual([]);
  });
});

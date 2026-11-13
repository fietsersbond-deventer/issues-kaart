import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readonly, ref } from "vue";
import { NominatimSearchProvider, PhotonSearchProvider, useLocationSearch, type SearchResult } from "../app/composables/useLocationSearch";
const fetch = vi.fn();
beforeEach(() => { fetch.mockReset(); vi.stubGlobal("fetch", fetch); vi.stubGlobal("ref", ref); vi.stubGlobal("readonly", readonly); vi.spyOn(console, "error").mockImplementation(() => { }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function result(id: string, overrides: Partial<SearchResult> = {}): SearchResult { return { id, name: id, displayName: id, type: "street", boundingBox: [6.1, 52.2, 6.2, 52.3], coordinates: [6.15, 52.25], ...overrides }; }
describe("location search", () => {
    it("converts Photon extents, filters unusable results and forwards cancellation", async () => {
        fetch.mockResolvedValueOnce({ json: async () => ({ features: [{ properties: { name: "Street", type: "street", extent: [6, 53, 7, 52], osm_type: "W", osm_id: "1", postcode: "1234", city: "Town", lat: 52.5, lon: 6.5 } }, { properties: { name: "No extent" } }, { properties: { extent: [0, 1, 1, 0] } }] }) });
        const provider = new PhotonSearchProvider("52", "6");
        const signal = new AbortController().signal;
        const results = await provider.search("Main street", signal);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("q=Main+street"), { signal });
        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({ id: "W_1", coordinates: [6.5, 52.5], boundingBox: [6, 52, 7, 53] });
        expect(provider.getTitle(results[0]!)).toContain("Street");
        expect(provider.getTitle(result("x", { displayName: "", name: "" }))).toBe("Onbekende locatie");
    });
    it("maps Nominatim numbers, uses fallbacks and renders Dutch type/context titles", async () => {
        fetch.mockResolvedValueOnce({ json: async () => [{ place_id: "1", osm_type: "way", osm_id: "7", name: "Road", display_name: "Road, Town, Province, Country", type: "road", boundingbox: ["52", "53", "6", "7"], lat: "52.5", lon: "6.5", address_rank: 10 }, { place_id: "2", display_name: "Fallback, Town", class: "place", boundingbox: ["0", "1", "2", "3"], lat: "0", lon: "2" }, { display_name: "Invalid", boundingbox: [] }] });
        const provider = new NominatimSearchProvider();
        const results = await provider.search("Road");
        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({ id: "way_7", coordinates: [6.5, 52.5], boundingBox: [6, 52, 7, 53], addressRank: 10 });
        expect(results[1]).toMatchObject({ id: "2", name: "Fallback", type: "place" });
        expect(provider.getTitle(results[0]!)).toContain("weg • Town, Province, Country");
        expect(provider.getTitle(result("x", { displayName: "", name: "Fallback" }))).toBe("Fallback");
        expect(provider.getTitle(result("x", { type: "other", displayName: "x, Town" }))).toContain("other");
    });
    it("deduplicates results, preferring squares, numbered addresses and complete areas", async () => {
        const provider = { getTitle: (r: SearchResult) => r.name, search: vi.fn().mockResolvedValue([
                result("segment", { name: "Square" }), result("square", { name: "Square", type: "square" }),
                result("plain", { name: "Road" }), result("number", { name: "Road", displayName: "Road 2" }),
                result("small", { name: "Park" }), result("large", { name: "Park", boundingBox: [6, 52, 7, 53] }),
            ]) };
        const search = useLocationSearch(provider);
        expect((await search.search("x")).map((r) => r.id).sort()).toEqual(["large", "number", "square"]);
        expect(search.isSearching.value).toBe(false);
    });
    it("prioritizes nearby results over address rank and limits results", async () => {
        const entries = Array.from({ length: 15 }, (_, i) => result(String(i), { addressRank: i ? 0 : 99, coordinates: i ? [7, 54] : [6.15, 52.25] }));
        const provider = { getTitle: () => "", search: vi.fn().mockResolvedValue(entries) };
        const results = await useLocationSearch(provider).search("x");
        expect(results).toHaveLength(10);
        expect(results[0]!.coordinates).toEqual([6.15, 52.25]);
    });
    it("keeps streets with the same name in different towns distinct", async () => {
        const raw = { place_id: "1", lat: "52", lon: "6", display_name: "Road", boundingbox: ["52", "53", "6", "7"] as [string, string, string, string] };
        const provider = { getTitle: () => "", search: vi.fn().mockResolvedValue([
            result("town1", { name: "Road", raw: { ...raw, address: { road: "Road", town: "One" } } }),
            result("town2", { name: "Road", raw: { ...raw, address: { road: "Road", village: "Two" } } }),
        ]) };
        expect((await useLocationSearch(provider).search("Road")).map((entry) => entry.id).sort()).toEqual(["town1", "town2"]);
    });
    it("aborts the previous request and recovers from abort and transport errors", async () => {
        const provider = { getTitle: () => "", search: vi.fn().mockResolvedValue([]) };
        const search = useLocationSearch(provider);
        await search.search("one");
        const signal = provider.search.mock.calls[0]![1] as AbortSignal;
        await search.search("two");
        expect(signal.aborted).toBe(true);
        provider.search.mockRejectedValueOnce(new DOMException("abort", "AbortError"));
        expect(await search.search("three")).toEqual([]);
        provider.search.mockRejectedValueOnce(new Error("offline"));
        expect(await search.search("four")).toEqual([]);
        expect(search.isSearching.value).toBe(false);
    });
});

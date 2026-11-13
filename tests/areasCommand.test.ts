import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { main } from "../scripts/gebieden";
const disk = vi.hoisted(() => ({ readFileSync: vi.fn(), writeFileSync: vi.fn() }));
vi.mock("node:fs", () => disk);
const square = { type: "Feature", properties: { statnaam: "Deventer" }, geometry: { type: "Polygon", coordinates: [[[6.1234567, 52], [7, 52], [7, 53], [6.1234567, 52]]] } };
const collection = () => ({ type: "FeatureCollection", features: [] as unknown[] });
const fetch = vi.fn();
beforeEach(() => { fetch.mockReset(); disk.readFileSync.mockReturnValue(JSON.stringify(collection())); disk.writeFileSync.mockReset(); vi.stubGlobal("fetch", fetch); fetch.mockResolvedValue({ ok: true, json: async () => ({ features: [square] }) }); vi.spyOn(console, "log").mockImplementation(() => { }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("adds a normalized rounded MultiPolygon area, then replaces it by name", async () => {
    await main(["add", "https://example.test", "Deventer", "--name", "Area"]);
    const first = JSON.parse(disk.writeFileSync.mock.calls[0]![1]);
    expect(first.features[0]).toMatchObject({ properties: { name: "Area", areaUrl: "https://example.test/" }, geometry: { type: "MultiPolygon" } });
    expect(first.features[0].geometry.coordinates[0][0][0]).toEqual([6.12346, 52]);
    disk.readFileSync.mockReturnValue(JSON.stringify(first));
    await main(["add", "https://changed.test", "Deventer", "--name", "Area"]);
    expect(JSON.parse(disk.writeFileSync.mock.calls[1]![1]).features).toEqual([expect.objectContaining({ properties: expect.objectContaining({ name: "Area", areaUrl: "https://changed.test/" }) })]);
});
it("lists and removes known areas without losing unrelated entries", async () => {
    disk.readFileSync.mockReturnValue(JSON.stringify({ type: "FeatureCollection", features: [{ properties: { name: "Area", areaUrl: "https://example.test" } }, { properties: { name: "Other", areaUrl: "https://other.test" } }] }));
    await main(["list"]);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("https://example.test"));
    await main(["remove", "Area"]);
    expect(JSON.parse(disk.writeFileSync.mock.calls[0]![1]).features).toEqual([{ properties: { name: "Other", areaUrl: "https://other.test" } }]);
    await expect(main(["remove", "missing"])).rejects.toThrow("niet gevonden");
});
it("searches municipality names and reports upstream errors or unknown municipalities", async () => {
    await main(["gemeenten", "DEVENT"]);
    expect(console.log).toHaveBeenCalledWith("Deventer");
    await expect(main(["add", "https://example.test", "Deventerr"])).rejects.toThrow("Bedoel je: Deventer");
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(main(["gemeenten"])).rejects.toThrow("PDOK gaf 503");
    expect(disk.writeFileSync).not.toHaveBeenCalled();
});

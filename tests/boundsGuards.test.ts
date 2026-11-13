import { describe, expect, it } from "vitest";
import { isBoundsObject, isBoundsTuples } from "../app/types/IBounds";
describe("untrusted map bounds", () => {
    it.each([null, undefined, "invalid", {}, { south: "52", north: 53, west: 6, east: 7 }])("rejects invalid object bounds without throwing: %j", (value) => { expect(isBoundsObject(value)).toBe(false); });
    it.each([null, undefined, {}, [], [null, null], [[1, 2], [3]], [[1, "2"], [3, 4]]])("rejects invalid tuple bounds without throwing: %j", (value) => { expect(isBoundsTuples(value)).toBe(false); });
    it("accepts geographic objects and coordinate pairs", () => { expect(isBoundsObject({ south: 52, north: 53, west: 6, east: 7 })).toBe(true); expect(isBoundsTuples([[6, 52], [7, 53]])).toBe(true); });
});

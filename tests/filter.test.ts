import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { useFilter } from "../app/composables/useFilter";

beforeEach(() => vi.stubGlobal("computed", computed));
afterEach(() => vi.unstubAllGlobals());

describe("zoekresultaten markeren", () => {
  it.each([{ filters: [] }, { filters: ["fiets"] }])("behandelt HTML in titels en snippets als tekst met filters $filters", ({ filters }) => {
    const { emphasizeFilter } = useFilter(ref(filters));
    const result = emphasizeFilter('<img src=x onerror="alert(1)"> fiets & route');
    expect(result).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(result).toContain('&amp; route');
    expect(result).not.toContain('<img');
  });

  it("markeert alle overeenkomsten zonder hoofdlettergevoeligheid", () => {
    const { emphasizeFilter } = useFilter(ref(["fiets"]));
    expect(emphasizeFilter("Fiets en fiets" )).toBe("<mark>Fiets</mark> en <mark>fiets</mark>");
  });
  it("behoudt tekst zonder zoekterm en lege tekst", () => {
    const { emphasizeFilter } = useFilter(ref([]));
    expect(emphasizeFilter("Route")).toBe("Route");
    expect(emphasizeFilter("")).toBe("");
  });
});

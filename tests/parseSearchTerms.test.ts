import { describe, expect, it } from "vitest";
import { parseSearchTerms } from "../app/utils/parseSearchTerms";

describe("parseSearchTerms", () => {
  it("keeps whitespace inside double quotes in a single term", () => {
    expect(parseSearchTerms('fiets "zonder fietspad" route')).toEqual([
      "fiets",
      "zonder fietspad",
      "route",
    ]);
  });

  it("splits unquoted whitespace and ignores empty terms", () => {
    expect(parseSearchTerms("  fiets   route  ")).toEqual(["fiets", "route"]);
  });

  it("treats an unmatched quote as a phrase through the end", () => {
    expect(parseSearchTerms('fiets "zonder fietspad')).toEqual([
      "fiets",
      "zonder fietspad",
    ]);
  });
});

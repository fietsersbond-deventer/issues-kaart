import { describe, expect, it } from "vitest";
import { normalizeTag, normalizeTags } from "../server/utils/issueTags";

describe("issue tag normalization", () => {
  it("normalizes tags into url-friendly slugs", () => {
    expect(normalizeTag(" Fiets Parkeren ")).toBe("fiets-parkeren");
    expect(normalizeTag("Éénrichtingsverkeer!")).toBe("eenrichtingsverkeer");
    expect(normalizeTag("veiligheid---school")).toBe("veiligheid-school");
  });

  it("removes empty tags and deduplicates normalized values", () => {
    expect(normalizeTags(["", "Fiets Parkeren", "fiets-parkeren", "   "])).toEqual([
      "fiets-parkeren",
    ]);
  });

  it("limits tag length and count", () => {
    const tags = Array.from({ length: 12 }, (_, index) => `tag-${index}`);

    expect(normalizeTag("een-heel-lange-tagnaam-die-wordt-afgekapt")).toHaveLength(
      30,
    );
    expect(normalizeTags(tags)).toHaveLength(10);
  });
});
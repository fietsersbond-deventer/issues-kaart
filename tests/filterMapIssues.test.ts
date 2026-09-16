import { describe, expect, it } from "vitest";
import type { MapIssue } from "../shared/types/Issue";
import { filterMapIssues } from "../app/utils/filterMapIssues";

const issues = [
  { id: 1, legend_id: 1, tags: ["one", "two"] },
  { id: 2, legend_id: 2, tags: ["one"] },
  { id: 3, legend_id: 3, tags: ["two"] },
  { id: 4, legend_id: null, tags: ["one", "two"] },
] as unknown as MapIssue[];

describe("filterMapIssues", () => {
  it("combines legends with OR", () => {
    const result = filterMapIssues(issues, new Set(), new Set([1, 3]));

    expect(result.map((issue) => issue.id)).toEqual([1, 3, 4]);
  });

  it("combines tags with AND", () => {
    const result = filterMapIssues(
      issues,
      new Set(["one", "two"]),
      new Set([1, 2, 3]),
    );

    expect(result.map((issue) => issue.id)).toEqual([1, 4]);
  });
});
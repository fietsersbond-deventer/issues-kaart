import type { BBox, Geometry } from "geojson";
import toBbox from "@turf/bbox";
import { getIssuesBbox } from "./getIssuesBbox";

export type FocusTarget =
  | { type: "area"; bbox: BBox }
  | { type: "filter"; bbox: BBox }
  | { type: "issue"; id: number; bbox: BBox; isPoint: boolean };

export interface FocusInput {
  /** which trigger was last: a new issue or a changed filter */
  prefer: "issue" | "filter";
  areaBbox?: BBox;
  /** the issue the URL points to; undefined when none */
  selectedId: number | null;
  /** the loaded selected issue; may lag behind selectedId */
  issue?: { id?: number; geometry?: Geometry | null } | null;
  filterActive: boolean;
  selectedIssues: { geometry?: Geometry | null; bbox?: BBox }[];
}

/**
 * Decides what the map should show, or undefined when it is not yet
 * known (selected issue still loading) or there is nothing to show.
 */
export function resolveFocusTarget(input: FocusInput): FocusTarget | undefined {
  const { prefer, areaBbox, selectedId, issue, filterActive } = input;

  // wait for the issue from the URL instead of flashing another target first
  if (prefer === "issue" && selectedId !== null && issue?.id !== selectedId) {
    return undefined;
  }

  const issueTarget = (): FocusTarget | undefined => {
    if (selectedId === null || issue?.id !== selectedId || !issue.geometry) {
      return undefined;
    }
    return {
      type: "issue",
      id: selectedId,
      bbox: toBbox(issue.geometry),
      isPoint: issue.geometry.type === "Point",
    };
  };

  const filterTarget = (): FocusTarget | undefined => {
    if (!filterActive) return undefined;
    const bbox = getIssuesBbox(input.selectedIssues);
    return bbox && { type: "filter", bbox };
  };

  const found =
    prefer === "issue"
      ? (issueTarget() ?? filterTarget())
      : filterTarget();
  if (found) return found;
  return areaBbox && { type: "area", bbox: areaBbox };
}

/** Changes when the view has to move; stable for edits that don't touch geometry */
export function focusKey(target: FocusTarget): string {
  const id = target.type === "issue" ? target.id : "";
  return `${target.type}${id}:${target.bbox.map((n) => n.toFixed(6)).join(",")}`;
}

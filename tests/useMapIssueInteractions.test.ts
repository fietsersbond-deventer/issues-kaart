import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref, toRaw } from "vue";
import { Collection, Feature } from "ol";
import { Point, LineString, Polygon } from "ol/geom";
import type { SelectEvent } from "ol/interaction/Select";
import type { ModifyEvent } from "ol/interaction/Modify";
import VectorLayer from "ol/layer/Vector";
import type { Issue, MapIssue, NewIssue } from "../shared/types/Issue";
import { useMapIssueInteractions } from "../app/composables/useMapIssueInteractions";

const selectedId = ref<number | null>(null);
const selectedIssue = ref<Issue | NewIssue | null>(null);
const selectedIssues = ref<MapIssue[]>([]);
const editing = ref(false);
const navigate = vi.fn();
const clicked = vi.fn();
const route = { query: { tag: "veilig", cat: "2" } };
const geometry: Issue["geometry"] = { type: "Point", coordinates: [6, 52] };
function issue(id = 1): Issue {
  return {
    id, title: "Onderwerp", description: "", geometry: structuredClone(geometry),
    tags: [], legend_id: 1, imageUrl: null, created_at: new Date(),
    legend: { id: 1, name: "Categorie", color: "red", description: "", created_at: "2026-01-01" },
  };
}
function select(selected: Feature[]): SelectEvent {
  return { selected } as SelectEvent;
}
function modify(features: Feature[]): ModifyEvent {
  return { features: new Collection(features) } as ModifyEvent;
}

beforeEach(() => {
  vi.clearAllMocks();
  selectedId.value = null;
  selectedIssue.value = null;
  selectedIssues.value = [issue()];
  editing.value = false;
  route.query = { tag: "veilig", cat: "2" };
  for (const [name, value] of Object.entries({ ref, computed })) vi.stubGlobal(name, value);
  vi.stubGlobal("storeToRefs", (store: unknown) => store);
  vi.stubGlobal("useSelectedIssue", () => ({ issue: selectedIssue, selectedId }));
  vi.stubGlobal("useSelectedIssues", () => ({ selectedIssues }));
  vi.stubGlobal("useIsEditing", () => ({ isEditing: editing }));
  vi.stubGlobal("useRoute", () => route);
  vi.stubGlobal("navigateTo", navigate);
});
afterEach(() => vi.unstubAllGlobals());

describe("useMapIssueInteractions", () => {
  it("navigeert alleen naar het eerste geselecteerde onderwerp met de actuele query", () => {
    const interaction = useMapIssueInteractions(clicked);
    route.query = { tag: "nieuw", cat: "3" };
    interaction.onFeatureSelect(select([new Feature({ id: 2 }), new Feature({ id: 3 })]));
    expect(selectedId.value).toBe(2);
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ path: "/kaart/2", query: route.query });
    expect(clicked).toHaveBeenCalledOnce();
    expect(interaction.selectedFeatures.value.getLength()).toBe(0);
  });

  it("verzamelt herselecties en wist ze bij deselectie zonder navigatie", () => {
    selectedId.value = 1;
    const interaction = useMapIssueInteractions(clicked);
    const feature = new Feature(new Point([0, 0]));
    feature.set("id", 1);
    interaction.onFeatureSelect(select([feature]));
    expect(toRaw(interaction.selectedFeatures.value.item(0))).toBe(feature);
    expect(navigate).not.toHaveBeenCalled();
    expect(clicked).not.toHaveBeenCalled();
    interaction.onFeatureSelect(select([]));
    expect(interaction.selectedFeatures.value.getLength()).toBe(0);
  });

  it("deelt geen selectiecollectie tussen kaartinstanties", () => {
    selectedId.value = 1;
    const first = useMapIssueInteractions(clicked);
    const second = useMapIssueInteractions(clicked);
    first.onFeatureSelect(select([new Feature({ id: 1 })]));
    expect(first.selectedFeatures.value.getLength()).toBe(1);
    expect(second.selectedFeatures.value.getLength()).toBe(0);
  });

  it("sluit alleen de gebiedslaag uit van selectie", () => {
    const interaction = useMapIssueInteractions(clicked);
    expect(interaction.isNotAreaLayer(new VectorLayer({ className: "area-layer" }))).toBe(false);
    expect(interaction.isNotAreaLayer(new VectorLayer())).toBe(true);
  });

  it("schakelt bewerken reactief in voor bestaande en nieuwe onderwerpen", () => {
    const { modifyEnabled } = useMapIssueInteractions(clicked);
    expect(modifyEnabled.value).toBe(false);
    editing.value = true;
    expect(modifyEnabled.value).toBe(false);
    selectedIssue.value = issue();
    expect(modifyEnabled.value).toBe(true);
    selectedIssue.value = { title: "Nieuw", description: "", tags: [] };
    expect(modifyEnabled.value).toBe(true);
    editing.value = false;
    expect(modifyEnabled.value).toBe(false);
  });

  it.each([
    new Point([6, 52]),
    new LineString([[6, 52], [6.1, 52.1]]),
    new Polygon([[[6, 52], [6.1, 52], [6, 52.1], [6, 52]]]),
  ])("schrijft een gewijzigde geometrie in WGS84 naar beide onderwerpobjecten", original => {
    selectedId.value = 1;
    selectedIssue.value = issue();
    selectedIssues.value = [issue(2), issue()];
    const unchanged = structuredClone(toRaw(selectedIssues.value[0]));
    const interaction = useMapIssueInteractions(clicked);
    interaction.onModifyEnd(modify([new Feature(original.clone().transform("EPSG:4326", "EPSG:3857"))]));
    const result = selectedIssue.value.geometry!;
    expect(result.type).toBe(original.getType());
    const actual = (result.coordinates as number[]).flat(Infinity);
    const expected = original.getCoordinates().flat(Infinity) as number[];
    actual.forEach((coordinate, index) => expect(coordinate).toBeCloseTo(expected[index]!, 7));
    expect(selectedIssues.value[1]!.geometry).toEqual(result);
    expect(selectedIssues.value[0]).toEqual(unchanged);
  });

  it("werkt de geselecteerde geometrie ook bij als het onderwerp niet in het filter staat", () => {
    selectedId.value = 7;
    selectedIssue.value = issue(7);
    selectedIssues.value = [issue(2)];
    const interaction = useMapIssueInteractions(clicked);
    interaction.onModifyEnd(modify([new Feature(new Point([0, 0]))]));
    expect(selectedIssue.value.geometry!.coordinates[0]).toBeCloseTo(0);
    expect(selectedIssues.value[0]!.geometry).toEqual(geometry);
  });

  it("laat geometrieën ongemoeid bij een lege modify-collectie", () => {
    selectedIssue.value = issue();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useMapIssueInteractions(clicked).onModifyEnd(modify([]));
    expect(selectedIssue.value.geometry).toEqual(geometry);
    expect(warn).toHaveBeenCalledExactlyOnceWith("No feature modified");
    warn.mockRestore();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, nextTick, ref, shallowRef, watch } from "vue";
import { useMapFocus } from "../app/composables/useMapFocus";

let scope: ReturnType<typeof effectScope>;
const issue = ref({ id: 1, geometry: { type: "Point", coordinates: [6, 52] } });
const selectedId = ref<number | null>(1);
const isEditing = ref(false);
const selectedTags = ref<string[]>([]);
const fit = vi.fn();
const cancelAnimations = vi.fn();

function setup() {
  const padding = ref<[number, number, number, number]>([50, 50, 50, 50]);
  const size = ref<[number, number]>([800, 600]);
  const mapRef = shallowRef({ map: {
    getView: () => ({ fit, cancelAnimations, getZoom: () => 12 }),
    updateSize: vi.fn(),
  } });
  scope = effectScope();
  const result = scope.run(() => useMapFocus(mapRef as never, padding, size))!;
  return { ...result, padding, size };
}

async function settle() {
  await nextTick();
  await vi.advanceTimersByTimeAsync(1200);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  selectedId.value = 1;
  issue.value = { id: 1, geometry: { type: "Point", coordinates: [6, 52] } };
  isEditing.value = false;
  selectedTags.value = [];
  for (const [key, value] of Object.entries({ ref, computed, watch, nextTick })) vi.stubGlobal(key, value);
  vi.stubGlobal("storeToRefs", (store: unknown) => store);
  vi.stubGlobal("useSelectedIssue", () => ({ issue, selectedId }));
  vi.stubGlobal("useIssues", () => ({ isLoaded: ref(true) }));
  vi.stubGlobal("useSelectedIssues", () => ({ selectedIssues: computed(() => [issue.value]) }));
  vi.stubGlobal("useTagFilters", () => ({ selectedTags }));
  vi.stubGlobal("useCategoryFilters", () => ({ visibleCategoryIds: ref(new Set()), isShowingAllCategories: ref(true) }));
  vi.stubGlobal("useIsEditing", () => ({ isEditing }));
  vi.stubGlobal("useDisplay", () => ({ mobile: ref(false) }));
  vi.stubGlobal("useCurrentArea", () => ({ bbox: [6, 52, 7, 53] }));

});

afterEach(() => {
  scope.stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("kaartfocus", () => {
  it("kadert een onderwerp bij openen via een URL en volgt een ander onderwerp", async () => {
    setup();
    await settle();
    expect(fit).toHaveBeenCalledTimes(2); // eerst het gebied, daarna het geselecteerde onderwerp
    fit.mockClear();
    selectedId.value = 2;
    await settle();
    expect(fit).not.toHaveBeenCalled(); // wacht op het bijbehorende onderwerp
    issue.value = { id: 2, geometry: { type: "Point", coordinates: [6.1, 52.1] } };
    await settle();
    expect(fit).toHaveBeenCalledTimes(1);
  });

  it("verplaatst de kaart niet tijdens een geometriebewerking", async () => {
    setup();
    await settle();
    fit.mockClear();
    isEditing.value = true;
    issue.value.geometry.coordinates = [6.2, 52.2];
    await settle();
    expect(fit).not.toHaveBeenCalled();
  });

  it("voert een ingeplande zoom niet uit nadat bewerken is gestart", async () => {
    setup();
    await settle();
    fit.mockClear();
    selectedId.value = 2;
    issue.value = { id: 2, geometry: { type: "Point", coordinates: [6.1, 52.1] } };
    await nextTick();
    isEditing.value = true;
    await settle();
    expect(fit).not.toHaveBeenCalled();
  });
});

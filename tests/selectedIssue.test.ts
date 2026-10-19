// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, nextTick, onUnmounted, reactive, ref, watch } from "vue";
import { createPinia, defineStore, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
vi.stubGlobal("defineStore", defineStore);
const { useSelectedIssue } = await import("../app/composables/useSelectedIssue");

let receive: (message: { type: string; payload: unknown }) => void;
let wrapper: ReturnType<typeof mount>;
let store: ReturnType<typeof useSelectedIssue>;
let route: { params: { id: string } };
const categories = ref<{ id: number; name: string }[]>([]);
const navigate = vi.fn();
const loadedIssue = { id: 1, title: "Onderwerp", geometry: { type: "Point", coordinates: [6, 52] } };

beforeEach(async () => {
  vi.clearAllMocks();
  categories.value = [];
  route = reactive({ params: { id: "1" } });
  for (const [name, value] of Object.entries({ computed, defineStore, onUnmounted, ref, watch })) vi.stubGlobal(name, value);
  vi.stubGlobal("storeToRefs", (value: unknown) => value);
  vi.stubGlobal("useRoute", () => route);
  vi.stubGlobal("useIsEditing", () => ({ isEditing: ref(false) }));
  vi.stubGlobal("useCategories", () => ({ categories }));
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({ subscribe: (listener: typeof receive) => { receive = listener; return vi.fn(); } }));
  vi.stubGlobal("$fetch", vi.fn().mockResolvedValue(loadedIssue));
  vi.stubGlobal("navigateTo", navigate);
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(defineComponent({ setup() { store = useSelectedIssue(); return () => null; } }), { global: { plugins: [pinia] } });
  await nextTick();
});

afterEach(() => { store.$dispose(); wrapper.unmount(); vi.unstubAllGlobals(); });

describe("geselecteerd onderwerp", () => {
  it("maakt een leeg concept bij het openen van een nieuw onderwerp", async () => {
    route.params.id = "new";
    await nextTick();
    expect(store.selectedId).toBeNull();
    expect(store.issue).toEqual({ title: "", description: "", tags: [] });
  });

  it("haalt een ander onderwerp op wanneer de route verandert", async () => {
    vi.mocked(globalThis.$fetch).mockResolvedValueOnce({ ...loadedIssue, id: 2 });
    route.params.id = "2";
    await nextTick();
    await nextTick();
    expect(store.selectedId).toBe(2);
    expect(store.issue?.id).toBe(2);
  });

  it("negeert berichten als er geen bestaand onderwerp is geselecteerd", () => {
    store.selectedId = null;
    receive({ type: "issue-deleted", payload: { id: 1 } });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("werkt het geselecteerde onderwerp bij vanuit een websocketbericht", () => {
    receive({ type: "issue-modified", payload: { ...loadedIssue, title: "Gewijzigd" } });
    expect(store.issue?.title).toBe("Gewijzigd");
  });

  it("decodeert geometrie en zoekt de categorie op bij een wijzigingsbericht", () => {
    categories.value = [{ id: 3, name: "Fietsroute" }];
    receive({ type: "issue-modified", payload: { ...loadedIssue, legend_id: 3, geometry: JSON.stringify(loadedIssue.geometry) } });
    expect(store.issue?.geometry).toEqual(loadedIssue.geometry);
    expect(store.issue?.legend).toEqual(categories.value[0]);
  });

  it("behoudt gegevens als een categorie ontbreekt en negeert wijzigingen van andere onderwerpen", () => {
    receive({ type: "issue-modified", payload: { ...loadedIssue, legend_id: 99 } });
    expect(store.issue?.legend_id).toBe(99);
    receive({ type: "issue-modified", payload: { ...loadedIssue, id: 2, title: "Ander" } });
    expect(store.issue?.id).toBe(1);
  });

  it("navigeert terug naar de kaart wanneer het geselecteerde onderwerp wordt verwijderd", () => {
    receive({ type: "issue-deleted", payload: { id: 1, title: "Onderwerp" } });
    expect(navigate).toHaveBeenCalledWith("/kaart");
  });

  it("haalt het onderwerp uit de route op", () => {
    expect(store.selectedId).toBe(1);
    expect(store.issue).toEqual(loadedIssue);
  });

  it("blijft bij het onderwerp wanneer een ander onderwerp wordt verwijderd", () => {
    receive({ type: "issue-deleted", payload: { id: 2, title: "Ander onderwerp" } });
    expect(navigate).not.toHaveBeenCalled();
  });
});

it("keeps the most recently selected issue when older requests resolve last", async () => {
  let resolveOld: (value: typeof loadedIssue) => void;
  let resolveNew: (value: typeof loadedIssue) => void;
  vi.mocked(globalThis.$fetch)
    .mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
    .mockReturnValueOnce(new Promise((resolve) => { resolveNew = resolve; }));
  route.params.id = "2";
  await nextTick();
  route.params.id = "3";
  await nextTick();
  resolveNew!({ ...loadedIssue, id: 3 });
  await nextTick();
  resolveOld!({ ...loadedIssue, id: 2 });
  await nextTick();
  expect(store.selectedId).toBe(3);
  expect(store.issue?.id).toBe(3);
});

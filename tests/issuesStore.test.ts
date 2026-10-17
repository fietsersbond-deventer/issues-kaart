// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, nextTick, onUnmounted, ref, watch } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { isNewIssue } from "../shared/types/Issue";
import { useIssues } from "../app/composables/useIssues";

const makeIssue = (id: number) => ({ id, title: `Vorm ${id}`, legend_id: 1, tags: [], geometry: { type: "Point", coordinates: [6, 52] } });
let issue: ReturnType<typeof ref>;
let selectedId: ReturnType<typeof ref<number | null>>;
let store: ReturnType<typeof useIssues>;
let wrapper: ReturnType<typeof mount>;
let receive: (event: { type: string; payload: unknown }) => void;

beforeEach(() => {
  vi.useFakeTimers();
  issue = ref(makeIssue(1));
  selectedId = ref(1);
  for (const [name, value] of Object.entries({ computed, onUnmounted, ref, watch, isNewIssue })) vi.stubGlobal(name, value);
  vi.stubGlobal("storeToRefs", (value: unknown) => value);
  vi.stubGlobal("useSharedIssuesWebSocket", () => ({ subscribe: (listener: typeof receive) => { receive = listener; return vi.fn(); } }));
  vi.stubGlobal("useCategories", () => ({ categories: ref([]) }));
  vi.stubGlobal("useSelectedIssue", () => ({ issue, selectedId }));
  vi.stubGlobal("useIssuesMethods", () => ({}));
  vi.stubGlobal("useFetch", () => ({ data: ref([makeIssue(1), makeIssue(2)]), refresh: vi.fn(), status: ref("success") }));
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(defineComponent({ setup() { store = useIssues(); return () => null; } }), { global: { plugins: [pinia] } });
});
afterEach(() => { store.$dispose(); wrapper.unmount(); vi.useRealTimers(); vi.unstubAllGlobals(); });

async function settle() {
  await nextTick();
  await vi.advanceTimersByTimeAsync(150);
}

describe("kaartonderwerpen", () => {
  it("toont een geometriebewerking direct als lokale voorvertoning", async () => {
    issue.value.geometry = { type: "Point", coordinates: [7, 53] };
    await settle();
    expect(store.issues[0]?.geometry.coordinates).toEqual([7, 53]);
  });

  it("verwerkt opgeslagen wijzigingen via de websocket", async () => {
    const saved = { ...makeIssue(1), geometry: { type: "Point", coordinates: [8, 54] } };
    receive({ type: "issue-modified", payload: saved });
    expect(store.issues[0]?.geometry.coordinates).toEqual([8, 54]);
  });

  it("herstelt de opgeslagen geometrie zodra een andere vorm geselecteerd wordt", async () => {
    issue.value.geometry = { type: "Point", coordinates: [7, 53] };
    await settle();
    selectedId.value = 2;
    issue.value = makeIssue(2);
    await settle();
    expect(store.issues.find(item => item.id === 1)?.geometry.coordinates).toEqual([6, 52]);
  });

  it("laat een vertraagde voorvertoning de herstelactie niet overschrijven", async () => {
    issue.value.geometry = { type: "Point", coordinates: [7, 53] };
    await nextTick();
    issue.value.geometry = { type: "Point", coordinates: [8, 54] };
    await nextTick();
    selectedId.value = 2;
    issue.value = makeIssue(2);
    await settle();
    expect(store.issues.find(item => item.id === 1)?.geometry.coordinates).toEqual([6, 52]);
  });

  it("behoudt een opgeslagen wijziging bij het wisselen van vorm", async () => {
    issue.value.geometry = { type: "Point", coordinates: [7, 53] };
    await settle();
    const saved = { ...makeIssue(1), geometry: { type: "Point", coordinates: [7, 53] } };
    receive({ type: "issue-modified", payload: saved });
    issue.value = saved;
    await settle();
    selectedId.value = 2;
    issue.value = makeIssue(2);
    await settle();
    expect(store.issues.find(item => item.id === 1)?.geometry.coordinates).toEqual([7, 53]);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { nextTick, ref, shallowRef, effectScope } from "vue";
import { View } from "ol";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import { vueGlobals, withSetup } from "./helpers/vue";
const wrappers: Array<{
    unmount(): void;
}> = [];
let scope: ReturnType<typeof effectScope>;
beforeEach(() => { vueGlobals(); scope = effectScope(); vi.stubGlobal("useRuntimeConfig", () => ({ public: { map: { centerLon: "6", centerLat: "52", initialZoom: "10" } } })); });
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()); scope.stop(); vi.unstubAllGlobals(); vi.restoreAllMocks(); sessionStorage.clear(); });
it("shares projected initial map state and tracks map movement", async () => {
    const { useMapView, useMapViewState } = await import("../app/composables/useMapView");
    const view = new View({ center: [0, 0], zoom: 10 });
    const map = { getView: () => view };
    const mounted = withSetup(() => useMapView(shallowRef({ map } as Parameters<typeof useMapView>[0] extends import("vue").Ref<infer T> ? T : never)));
    wrappers.push(mounted.wrapper);
    expect(mounted.value.center.value[0]).toBeCloseTo(fromLonLat([6, 52])[0]!);
    view.setCenter([100, 200]);
    view.setZoom(12);
    view.setRotation(1);
    await nextTick();
    expect(mounted.value.center.value).toEqual([100, 200]);
    expect(mounted.value.zoom.value).toBe(12);
    expect(view.getRotation()).toBe(0);
    expect(useMapViewState().zoom.value).toBe(12);
});
it("observes container size and disconnects its observer on unmount", async () => {
    const { useMapResize } = await import("../app/composables/useMapResize");
    let notify: ResizeObserverCallback;
    const observe = vi.fn(), disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
        constructor(callback: ResizeObserverCallback) { notify = callback; }
        observe = observe;
        disconnect = disconnect;
    });
    const map = { updateSize: vi.fn() };
    const element = document.createElement("div");
    const mapRef = shallowRef({ $el: element, map });
    const mounted = withSetup(() => useMapResize(mapRef as unknown as Parameters<typeof useMapResize>[0]));
    wrappers.push(mounted.wrapper);
    await nextTick();
    expect(observe).toHaveBeenCalledWith(element);
    notify!([{ contentRect: { width: 800, height: 600 } }] as ResizeObserverEntry[], {} as ResizeObserver);
    expect(mounted.value.mapWidth.value).toBe(800);
    expect(mounted.value.mapHeight.value).toBe(600);
    expect(map.updateSize).toHaveBeenCalledTimes(1);
    mounted.wrapper.unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
});
it("persists only visible layer changes and accepts both OpenLayers component ref shapes", async () => {
    const { useMapLayerPreference } = await import("../app/composables/useMapLayerPreference");
    const preference = scope.run(useMapLayerPreference)!;
    const layer = new TileLayer({ visible: false });
    const layerRef = shallowRef<{
        tileLayer?: TileLayer;
        layer?: TileLayer;
    } | null>(null);
    scope.run(() => preference.watchLayerVisibility(layerRef, "Foto"));
    layerRef.value = { tileLayer: layer };
    await nextTick();
    layer.setVisible(true);
    await nextTick();
    expect(preference.preferredLayer.value).toBe("Foto");
    layer.setVisible(false);
    await nextTick();
    expect(preference.preferredLayer.value).toBe("Foto");
    expect(sessionStorage.getItem("preferred-map-layer")).toBe("Foto");
    layerRef.value = null;
    await nextTick();
    layerRef.value = { layer };
    await nextTick();
});
it("focuses the initial selection despite early editing, then preserves the view during edits", async () => {
    vi.useFakeTimers();
    try {
        const selectedId = ref<number | null>(1), issue = ref({ id: 1, geometry: { type: "Point", coordinates: [6, 52] } });
        const loaded = ref(false), editing = ref(false), tags = ref<string[]>([]), all = ref(true), categories = ref(new Set([1]));
        vi.stubGlobal("storeToRefs", (x: unknown) => x);
        vi.stubGlobal("useSelectedIssue", () => ({ selectedId, issue }));
        vi.stubGlobal("useIssues", () => ({ isLoaded: loaded }));
        vi.stubGlobal("useSelectedIssues", () => ({ selectedIssues: ref([issue.value]) }));
        vi.stubGlobal("useTagFilters", () => ({ selectedTags: tags }));
        vi.stubGlobal("useCategoryFilters", () => ({ visibleCategoryIds: categories, isShowingAllCategories: all }));
        vi.stubGlobal("useIsEditing", () => ({ isEditing: editing }));
        vi.stubGlobal("useCurrentArea", () => ({ bbox: [5, 51, 7, 53] }));
        const fit = vi.fn(), updateSize = vi.fn();
        const view = { fit, getZoom: () => 12, cancelAnimations: vi.fn() };
        const mapRef = shallowRef({ map: { getView: () => view, updateSize } });
        const { useMapFocus } = await import("../app/composables/useMapFocus");
        const padding = ref<[
            number,
            number,
            number,
            number
        ]>([0, 0, 0, 0]), size = ref<[
            number,
            number
        ]>([800, 600]);
        const focus = scope.run(() => useMapFocus(mapRef as unknown as Parameters<typeof useMapFocus>[0], padding, size))!;
        expect(fit).toHaveBeenCalledTimes(1);
        // The editor may open before the large metadata catalogue finishes.
        editing.value = true;
        loaded.value = true;
        await nextTick();
        await vi.advanceTimersByTimeAsync(150);
        expect(fit).toHaveBeenLastCalledWith(expect.any(Array), expect.objectContaining({ maxZoom: 15 }));
        fit.mockClear();
        editing.value = true;
        issue.value = { id: 1, geometry: { type: "Point", coordinates: [7, 53] } };
        await nextTick();
        await vi.advanceTimersByTimeAsync(200);
        expect(fit).not.toHaveBeenCalled();
        editing.value = false;
        tags.value = ["bike"];
        await nextTick();
        focus.refit({ overview: true });
        await vi.advanceTimersByTimeAsync(200);
        expect(fit).toHaveBeenCalled();
        fit.mockClear();
        padding.value = [10, 0, 0, 0];
        await nextTick();
        await vi.advanceTimersByTimeAsync(200);
        expect(fit).toHaveBeenCalled();
        size.value = [600, 400];
        await nextTick();
        expect(updateSize).toHaveBeenCalledTimes(1);
    }
    finally {
        scope.stop();
        vi.useRealTimers();
    }
});
it("resolves the current deployment area from the local hostname", async () => {
    const { useCurrentArea } = await import("../app/composables/useCurrentArea");
    const area = useCurrentArea();
    expect(area.hostname).toBe("deventer.kaart.fietsersbond.nl");
    expect(area.area?.geometry.type).toMatch(/Polygon/);
    expect(area.bbox).toHaveLength(4);
});

it("loads viewport geometry, cancels stale requests, preserves exact editor geometry and cleans up listeners", async () => {
    const { useMapViewportIssues } = await import("../app/composables/useMapViewportIssues");
    const { flushPromises } = await import("@vue/test-utils");
    const { default: Observable } = await import("ol/Observable");
    const view = new View({ center: fromLonLat([4.9, 52.3]), zoom: 13 });
    const map = Object.assign(new Observable(), { getView: () => view, getSize: () => [800, 600] });
    const revision = ref(0);
    const selected = shallowRef<import("../shared/types/Issue").MapIssue[]>([{ id: 1, title: "Line", legend_id: 1, tags: [], imageUrl: null, legend: { id: 1, name: "Cat", color: "red", description: "", created_at: "" } }]);
    vi.stubGlobal("storeToRefs", (value: unknown) => value);
    vi.stubGlobal("useIssues", () => ({ viewportRevision: revision }));
    let firstResolve: (value: unknown) => void;
    const fetch = vi.fn().mockImplementationOnce(() => new Promise(resolve => { firstResolve = resolve; })).mockResolvedValue([{ id: 1, geometry: { type: "Point", coordinates: [4.9, 52.3] } }]);
    vi.stubGlobal("$fetch", fetch);
    const value = scope.run(() => useMapViewportIssues(shallowRef({ map }) as unknown as Parameters<typeof useMapViewportIssues>[0], selected, ref(1)))!;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![1].query).toMatchObject({ fields: "id,geometry", cat: "1", bbox: expect.any(String) });
    view.setCenter(fromLonLat([4.91, 52.31]));
    map.dispatchEvent("moveend");
    await nextTick(); await flushPromises();
    expect(fetch.mock.calls[0]![1].signal.aborted).toBe(true);
    expect(value.issues.value[0]!.geometry).toEqual({ type: "Point", coordinates: [4.9, 52.3] });
    firstResolve!([{ id: 1, geometry: { type: "Point", coordinates: [6, 52] } }]);
    await flushPromises();
    expect(value.issues.value[0]!.geometry!.coordinates).toEqual([4.9, 52.3]);
    selected.value = [{ ...selected.value[0]!, geometry: { type: "Point", coordinates: [5, 53] } }];
    expect(value.issues.value[0]!.geometry!.coordinates).toEqual([5, 53]);
    fetch.mockRejectedValueOnce(new Error("offline"));
    revision.value++;
    await nextTick(); await flushPromises();
    expect(value.error.value).toContain("laden mislukt");
    revision.value++;
    await nextTick(); await flushPromises();
    expect(value.error.value).toBe("");
    selected.value = [];
    await nextTick();
    expect(value.issues.value).toEqual([]);
    scope.stop();
    expect(map.hasListener("moveend")).toBe(false);
    expect(map.hasListener("change:size")).toBe(false);
});

it("waits for an initialized map view before requesting viewport geometry", async () => {
    const { useMapViewportIssues } = await import("../app/composables/useMapViewportIssues");
    const { default: Observable } = await import("ol/Observable");
    const view = new View();
    const map = Object.assign(new Observable(), { getView: () => view, getSize: () => [800, 600] });
    vi.stubGlobal("storeToRefs", (value: unknown) => value);
    vi.stubGlobal("useIssues", () => ({ viewportRevision: ref(0) }));
    const fetch = vi.fn().mockResolvedValue([]);
    vi.stubGlobal("$fetch", fetch);
    scope.run(() => useMapViewportIssues(shallowRef({ map }) as unknown as Parameters<typeof useMapViewportIssues>[0], shallowRef([{ id: 1, title: "X", legend_id: 1 } as import("../shared/types/Issue").MapIssue])));
    expect(fetch).not.toHaveBeenCalled();
    view.setCenter(fromLonLat([4.9, 52.3])); view.setZoom(12);
    map.dispatchEvent("moveend");
    await nextTick();
    expect(fetch).toHaveBeenCalledTimes(1);
});

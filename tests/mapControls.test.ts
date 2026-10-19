// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import mitt from "mitt";
import { Feature } from "ol";
import { Point, LineString, Polygon as PolygonGeometry } from "ol/geom";
import { vueGlobals } from "./helpers/vue";
import { Slot, uiStubs } from "./helpers/ui";
import AddFeature from "../app/components/map/AddFeature.vue";
import Toolbar from "../app/components/Toolbar.vue";
import Legend from "../app/components/map/Legend.vue";
import Summary from "../app/components/map/MapFilterSummary.vue";
import Reset from "../app/components/map/ResetExtentControl.vue";
import SidePanel from "../app/components/map/SidePanel.vue";
import LayerPreview from "../app/components/map/LayerPreview.vue";
import Marker from "../app/components/map/MapMarker.vue";
import Polyline from "../app/components/map/MapPolyline.vue";
import Polygon from "../app/components/map/MapPolygon.vue";
import AreaTooltip from "../app/components/map/AreaTooltip.vue";
import Areas from "../app/components/map/Areas.vue";
import ControlContainer from "../app/components/map/ControlContainer.vue";
import CustomControl from "../app/components/ol-custom-control.vue";
import { ReactiveFeature } from "../app/utils/ReactiveFeature";
import type { NewIssue } from "../shared/types/Issue";
import type { MapEvents } from "../app/composables/useMapEventBus";
const Boundary = defineComponent({ name: "MapBoundary", props: ["type", "coordinates", "color", "width", "features", "style"], template: '<div><slot /></div>' });
const stubs = { ...uiStubs, VTable: Slot, VIcon: true, VTooltip: Slot, VFadeTransition: Slot, LegendIndicator: true, Tag: true, MapLegend: true, MapLayerSwitcher: true, MapAreaTooltip: true, VNavigationDrawer: Slot, OlInteractionDraw: Boundary, OlFeature: Boundary, OlGeomPoint: Boundary, OlGeomLineString: Boundary, OlGeomPolygon: Boundary, OlStyle: Boundary, OlStyleIcon: Boundary, OlStyleStroke: Boundary, OlStyleFill: Boundary, OlMap: Boundary, OlView: Boundary, OlTileLayer: Boundary, OlSourceXyz: Boundary, OlSourceTileWms: Boundary, OlVectorLayer: Boundary, OlSourceVector: Boundary, OlOverlay: Boundary };
let bus: ReturnType<typeof mitt<MapEvents>>;
const issue = ref<NewIssue | null>(null), selectedId = ref<number | null>(null), editing = ref(true), open = ref(true);
const wrappers: Array<{
    unmount(): void;
}> = [];
beforeEach(() => { vueGlobals(); bus = mitt<MapEvents>(); issue.value = { title: "New", description: "", tags: [] }; selectedId.value = null; editing.value = true; vi.stubGlobal("useMapEventBus", () => ({ inject: () => bus })); vi.stubGlobal("storeToRefs", (x: unknown) => x); vi.stubGlobal("useSelectedIssue", () => ({ issue, selectedId })); vi.stubGlobal("useIsEditing", () => ({ isEditing: editing })); vi.stubGlobal("confirm", vi.fn().mockReturnValue(true)); vi.stubGlobal("useMapMenu", () => ({ open })); vi.stubGlobal("useMapLayerPreference", () => ({ preferredLayer: ref("Licht") })); });
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function keep<T extends {
    unmount(): void;
}>(wrapper: T): T { wrappers.push(wrapper); return wrapper; }
// Ignore sub-metre projection noise while preserving coordinate order and nesting.
function roundCoordinates(value: unknown): unknown {
    return Array.isArray(value) ? value.map(roundCoordinates) : Math.round((value as number) * 1e6) / 1e6 || 0;
}
it("draws points, lines and polygons into the selected draft and clears drawing mode", async () => {
    const wrapper = keep(mount(AddFeature, { global: { stubs } }));
    for (const [event, geometry, expectedCoordinates] of [
        ["startPoint", new Point([1113194.9079327357, 0]), [10, 0]],
        ["startLine", new LineString([[0, 0], [1113194.9079327357, 0]]), [[0, 0], [10, 0]]],
        ["startPolygon", new PolygonGeometry([[[0, 0], [1113194.9079327357, 0], [1113194.9079327357, 1118889.9748579594], [0, 0]]]), [[[0, 0], [10, 0], [10, 10], [0, 0]]]],
    ] as const) {
        bus.emit(event);
        await flushPromises();
        const draw = wrapper.getComponent(Boundary);
        expect(draw.props("type")).toBe(geometry.getType());
        draw.vm.$emit("drawend", { feature: new Feature(geometry) });
        await flushPromises();
        expect(issue.value!.geometry?.type).toBe(geometry.getType());
        expect(roundCoordinates(issue.value!.geometry!.coordinates)).toEqual(expectedCoordinates);
        expect(wrapper.findComponent(Boundary).exists()).toBe(false);
    }
    bus.emit("startPoint");
    await flushPromises();
    bus.emit("clearFeature");
    await flushPromises();
    expect(wrapper.findComponent(Boundary).exists()).toBe(false);
});
it("toggles drawing tools and asks before replacing an existing geometry", async () => {
    const events: string[] = [];
    bus.on("*", (type) => events.push(type));
    const wrapper = keep(mount(Toolbar, { global: { stubs } }));
    const point = wrapper.get('button[aria-label="Teken punt"]');
    await point.trigger("click");
    expect(events).toEqual(["clearFeature", "startPoint"]);
    await point.trigger("click");
    expect(events.at(-1)).toBe("clearFeature");
    for (const label of ["Teken lijn", "Teken vlak"])
        await wrapper.get(`button[aria-label="${label}"]`).trigger("click");
    selectedId.value = 1;
    issue.value!.geometry = { type: "Point", coordinates: [6, 52] };
    vi.mocked(globalThis.confirm).mockReturnValueOnce(false);
    await point.trigger("click");
    expect(issue.value!.geometry).not.toBeNull();
    await point.trigger("click");
    expect(issue.value!.geometry).toBeNull();
});
it("renders category/tag counts, supports keyboard toggles and keeps an active zero-count tag removable", async () => {
    const toggleCategoryVisibility = vi.fn(), toggleTag = vi.fn();
    const selected = ref([{ legend_id: 1, tags: ["bike"] }]);
    vi.stubGlobal("useCategoryFilters", () => ({ usedCategories: ref([{ id: 1, name: "Routes", description: "Roads" }, { id: 2, name: "Parking" }]), toggleCategoryVisibility, isCategoryVisible: (id: number) => id === 1 }));
    vi.stubGlobal("useIssues", () => ({ issues: ref([{ tags: ["bike", "safe"] }]) }));
    vi.stubGlobal("useSelectedIssues", () => ({ selectedIssues: selected }));
    vi.stubGlobal("useTagFilters", () => ({ hasTag: (tag: string) => tag === "safe", toggleTag }));
    vi.stubGlobal("useTagsApi", () => ({ getTag: (tag: string) => ({ tag, label: tag }) }));
    const wrapper = keep(mount(Legend, { global: { stubs } }));
    const rows = wrapper.findAll("tr");
    await rows[0]!.trigger("click");
    await rows[0]!.trigger("keydown", { key: "Enter" });
    await rows[0]!.trigger("keydown", { key: " " });
    expect(toggleCategoryVisibility).toHaveBeenCalledTimes(3);
    await rows[2]!.trigger("click");
    await rows[3]!.trigger("keydown", { key: "Enter" });
    expect(toggleTag.mock.calls.map((call) => call[0])).toEqual(["bike", "safe"]);
    selected.value = [];
    await flushPromises();
    await rows[2]!.trigger("click");
    expect(toggleTag).toHaveBeenCalledTimes(2);
});
it("resets both filter groups and exposes the correct result count", async () => {
    const showAllCategories = vi.fn(), clearTags = vi.fn();
    vi.stubGlobal("useCategoryFilters", () => ({ isShowingAllCategories: ref(false), showAllCategories }));
    vi.stubGlobal("useTagFilters", () => ({ selectedTags: ref(["bike"]), clearTags }));
    vi.stubGlobal("useSelectedIssues", () => ({ selectedIssues: ref([{}]) }));
    const wrapper = keep(mount(Summary, { global: { stubs } }));
    expect(wrapper.text()).toContain("1 plek op de kaart");
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(showAllCategories).toHaveBeenCalledTimes(1);
    expect(clearTags).toHaveBeenCalledTimes(1);
    const reset = keep(mount(Reset, { global: { stubs } }));
    await reset.get("button").trigger("click");
    expect(reset.emitted("reset")).toHaveLength(1);
    open.value = true;
    const panel = keep(mount(SidePanel, { global: { stubs } }));
    await panel.get("button").trigger("click");
    expect(open.value).toBe(false);
});
it("transforms rendered geometries and exposes click selection", async () => {
    // Independently known EPSG:3857 coordinates for 10°E on the equator.
    const projected = [1113194.9079327357, 0];
    for (const [component, coordinates, expected] of [
        [Marker, [10, 0], projected],
        [Polyline, [[0, 0], [10, 0]], [[0, 0], projected]],
        [Polygon, [[[0, 0], [10, 0], [10, 10], [0, 0]]], [[[0, 0], projected, [1113194.9079327357, 1118889.9748579594], [0, 0]]]],
    ] as const) {
        const wrapper = keep(mount(component, { props: { coordinates, color: "#123456", selected: true } as never, global: { stubs } }));
        const feature = wrapper.findAllComponents(Boundary)[0]!;
        feature.vm.$emit("click");
        await flushPromises();
        expect(wrapper.emitted("click")).toHaveLength(1);
        const actual = wrapper.findAllComponents(Boundary)[1]!.props("coordinates");
        expect(roundCoordinates(actual)).toEqual(roundCoordinates(expected));
    }
});
it.each([
    ["Licht", "cartodb-basemaps"],
    ["Fiets", "tile-cyclosm.openstreetmap.fr"],
    ["Foto", "service.pdok.nl"],
])("previews %s with the matching tile provider and a wider view", (name, provider) => {
    const PreviewView = defineComponent({ props: ["center", "zoom", "rotation"], template: "<div />" });
    const TileSource = defineComponent({ props: ["url", "layers"], template: "<div />" });
    const preview = keep(mount(LayerPreview, {
        props: { name, center: [100, 200], zoom: 10, rotation: 0.5 },
        global: { stubs: { ...stubs, OlView: PreviewView, OlSourceXyz: TileSource, OlSourceTileWms: TileSource } },
    }));
    expect(preview.getComponent(PreviewView).props()).toEqual({ center: [100, 200], zoom: 7, rotation: 0.5 });
    const sources = preview.findAllComponents(TileSource);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.props("url")).toContain(provider);
    if (name === "Foto") expect(sources[0]!.props("layers")).toBe("Actueel_ortho25");
});
it("prioritizes issues over area tooltips, manages hover state and removes map listeners", async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const viewport = document.createElement("div");
    let hits: Feature[] = [];
    const map = { on: vi.fn((name, fn) => listeners.set(name, fn)), un: vi.fn(), getViewport: () => viewport, getFeaturesAtPixel: () => hits };
    const tooltip = keep(mount(AreaTooltip, { global: { stubs, provide: { map } } }));
    const area = new Feature();
    area.setProperties({ name: "Other area", areaUrl: "https://example.test" });
    hits = [area];
    listeners.get("pointermove")!({ pixel: [0, 0], coordinate: [1, 2] });
    await flushPromises();
    expect(tooltip.text()).toContain("Other area");
    expect(viewport.style.cursor).toBe("pointer");
    hits = [area, new Feature()];
    listeners.get("pointermove")!({ pixel: [0, 0], coordinate: [1, 2] });
    await flushPromises();
    expect(tooltip.text()).toBe("");
    vi.stubGlobal("useCurrentArea", () => ({ hostname: "deventer.kaart.fietsersbond.nl", area: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[6, 52], [7, 52], [7, 53], [6, 52]]] } } }));
    const areas = keep(mount(Areas, { global: { stubs, provide: { map } } }));
    expect(areas.findAllComponents(Boundary).some((c) => c.props("features")?.length === 1)).toBe(true);
    hits = [];
    listeners.get("pointermove")!({ pixel: [0, 0] });
    listeners.get("singleclick")!({ pixel: [0, 0] });
    areas.unmount();
    tooltip.unmount();
    expect(map.un).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(viewport.style.cursor).toBe("");
});
it("registers actual OpenLayers controls and removes them on unmount", () => {
    const map = { addControl: vi.fn(), removeControl: vi.fn() };
    for (const component of [ControlContainer, CustomControl]) {
        const wrapper = keep(mount(component, { props: { position: "top-left" }, slots: { default: "Control content" }, global: { provide: { map } } }));
        expect(wrapper.text()).toContain("Control content");
        wrapper.unmount();
    }
    expect(map.addControl).toHaveBeenCalledTimes(2);
    expect(map.removeControl).toHaveBeenCalledTimes(2);
});
it("wraps raw geometry as an editable feature and computes its bounds", () => {
    const feature = new ReactiveFeature();
    expect(feature.bounds).toBeNull();
    expect(feature.coordinates).toBeNull();
    feature.setFeature({ type: "LineString", coordinates: [[6, 52], [7, 53]] }, true);
    expect(feature.editable.value).toBe(true);
    expect(feature.bounds).toEqual({ west: 6, east: 7, south: 52, north: 53 });
    feature.clearFeature();
    expect(feature.feature.value).toBeNull();
    expect(feature.editable.value).toBe(false);
    expect(() => feature.setFeature({ type: "Feature", properties: {}, geometry: { type: "MultiPoint", coordinates: [] } })).toThrow("not supported");
});

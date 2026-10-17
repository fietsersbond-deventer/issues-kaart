// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount, type VueWrapper } from "@vue/test-utils";
import { computed, defineComponent, nextTick, ref, shallowRef, useTemplateRef, watch } from "vue";
import Feature from "ol/Feature";
import Collection from "ol/Collection";
import MapBrowserEvent from "ol/MapBrowserEvent";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import Select from "ol/interaction/Select";
import { click } from "ol/events/condition";
import { Point, LineString, Polygon } from "ol/geom";
import { Circle, type Style } from "ol/style";
import MapComponent from "../app/components/Map.client.vue";
import { useEditableMapFeatures } from "../app/composables/useEditableMapFeatures";

const SelectStub = defineComponent({ name: "OlInteractionSelect", emits: ["select"], template: "<div />" });
const MapStub = defineComponent({ name: "OlMap", emits: ["dblclick"], template: "<div><slot /></div>" });
const ModifyStub = defineComponent({ name: "OlInteractionModify", props: ["features"], emits: ["modifyend"], template: "<div />" });
const LayerStub = defineComponent({ name: "OlVectorLayer", props: ["style"], template: "<div><slot /></div>" });
let source: VectorSource;
let wrapper: VueWrapper;
let editing: ReturnType<typeof ref<boolean>>;
let drawing: ReturnType<typeof ref<boolean>>;
let selectedId: ReturnType<typeof ref<number | null>>;
let issue: ReturnType<typeof ref>;
let mapIssues: ReturnType<typeof ref>;
const navigate = vi.fn();
const authenticated = ref("authenticated");
const connected = ref(true);
const isLocked = vi.fn(() => false);
const cancelAnimations = vi.fn();

function mountMap(geometry: Point | LineString | Polygon = new Point([6, 52])) {
  const feature = new Feature({ id: 1, geometry });
  source.addFeature(feature);
  issue.value = { id: 1, title: "Onderwerp", geometry: { type: geometry.getType(), coordinates: geometry.getCoordinates() } };
  mapIssues.value = [JSON.parse(JSON.stringify(issue.value))];
  wrapper = shallowMount(MapComponent, {
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        "ol-map": MapStub, "ol-view": true, "ol-tile-layer": true,
        "ol-source-xyz": true, "ol-source-wmts": true, "ol-vector-layer": LayerStub,
        "ol-feature": true, "ol-geom-point": true, "ol-geom-line-string": true,
        "ol-geom-polygon": true, "ol-attribution-control": true,
        "ol-interaction-select": SelectStub, "ol-interaction-modify": ModifyStub,
        "ol-source-vector": defineComponent({
          setup(_, { expose }) { expose({ source }); }, template: "<div><slot /></div>",
        }),
        MapAddFeature: defineComponent({
          setup(_, { expose }) { expose({ isDrawing: drawing }); }, template: "<div />",
        }),
        MapControlContainer: true, MapResetExtentControl: true, MapFilterSummary: true,
        SizeCalculator: true, MapLegend: true, MapLayerSwitcher: true, MapAreas: true, MapTooltip: true,
      },
    },
  });
  const select = new Select({ condition: click, style: null });
  select.on("select", event => wrapper.getComponent(SelectStub).vm.$emit("select", event));
  async function clickMap(hit?: Feature) {
    select.handleEvent({
      type: "click", pixel: [10, 10],
      originalEvent: { shiftKey: false, altKey: false, metaKey: false, ctrlKey: false },
      map: { forEachFeatureAtPixel: (_pixel: unknown, callback: (f: Feature, layer: unknown) => void) => {
        if (hit) callback(hit, {});
      } },
    } as Parameters<Select["handleEvent"]>[0]);
    await nextTick();
  }
  async function doubleClickMap(hit?: Feature) {
    const event = new MapBrowserEvent("dblclick", {
      getEventPixel: () => [10, 10],
      getView: () => ({ cancelAnimations }),
      forEachFeatureAtPixel: (_pixel: unknown, callback: (f: Feature, layer: unknown) => unknown) => hit && callback(hit, {}),
    } as never, new MouseEvent("dblclick", { cancelable: true }) as never);
    wrapper.getComponent(MapStub).vm.$emit("dblclick", event);
    await nextTick();
    await nextTick();
    await nextTick();
    return event;
  }
  return { feature, select, clickMap, doubleClickMap };
}

beforeEach(() => {
  vi.clearAllMocks();
  authenticated.value = "authenticated";
  connected.value = true;
  isLocked.mockReturnValue(false);
  source = new VectorSource();
  editing = ref(false);
  drawing = ref(false);
  selectedId = ref(1);
  issue = ref(null);
  mapIssues = ref([]);
  for (const [name, value] of Object.entries({ ref, computed, watch, nextTick, shallowRef, useTemplateRef, useEditableMapFeatures })) vi.stubGlobal(name, value);
  vi.stubGlobal("storeToRefs", (store: unknown) => store);
  vi.stubGlobal("useSelectedIssue", () => ({ issue, selectedId }));
  vi.stubGlobal("useSelectedIssues", () => ({ selectedIssues: mapIssues }));
  vi.stubGlobal("useRoute", () => ({ query: { tag: "fiets" } }));
  vi.stubGlobal("useMapLayerPreference", () => ({ preferredLayer: ref("Licht"), watchLayerVisibility: vi.fn() }));
  vi.stubGlobal("useDisplay", () => ({ mobile: ref(false) }));
  vi.stubGlobal("useIsEditing", () => ({ isEditing: editing }));
  vi.stubGlobal("useAuth", () => ({ status: authenticated }));
  vi.stubGlobal("useConnectionStatus", () => ({ isConnected: connected }));
  vi.stubGlobal("useIssueLocks", () => ({ isLocked }));
  vi.stubGlobal("useMapView", () => ({ zoom: ref(15), center: ref([0, 0]) }));
  vi.stubGlobal("useMapResize", () => ({ mapWidth: ref(800), mapHeight: ref(600) }));
  vi.stubGlobal("useMapFocus", () => ({ refit: vi.fn() }));
  vi.stubGlobal("navigateTo", navigate);
});

afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); });

describe("kaartselectie", () => {
  it("navigeert naar een ander onderwerp en behoudt de filters", async () => {
    const state = mountMap();
    await state.clickMap(new Feature({ id: 2, geometry: new Point([6, 52]) }));
    expect(selectedId.value).toBe(2);
    expect(navigate).toHaveBeenCalledWith({ path: "/kaart/2", query: { tag: "fiets" } });
    expect(wrapper.emitted("feature-clicked")).toHaveLength(1);
  });

  it.each([undefined, null, "1", NaN, 0, -1])("negeert features met ongeldig onderwerp-ID %s", async id => {
    const state = mountMap();
    await state.clickMap(new Feature({ id }));
    expect(navigate).not.toHaveBeenCalled();
    expect(selectedId.value).toBe(1);
  });

  it.each([
    new Point([6, 52]),
    new LineString([[6, 52], [6.1, 52.1]]),
    new Polygon([[[6, 52], [6.1, 52], [6.1, 52.1], [6, 52]]]),
  ])("maakt %s direct bewerkbaar en houdt herhaalde selectie uniek", async geometry => {
    const state = mountMap(geometry);
    await state.clickMap(state.feature);
    editing.value = true;
    await nextTick();
    const features = wrapper.getComponent(ModifyStub).props("features");
    expect(features.getArray()).toEqual([state.feature]);
    await state.clickMap(state.feature);
    expect(features.getArray()).toEqual([state.feature]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("houdt de huidige vorm bewerkbaar na klikken op lege kaartgrond", async () => {
    const state = mountMap();
    await state.clickMap(state.feature);
    editing.value = true;
    await nextTick();
    await state.clickMap();
    expect(selectedId.value).toBe(1);
    expect(wrapper.getComponent(ModifyStub).props("features").getArray()).toEqual([state.feature]);
  });

  it("tekent de selectiering buiten een groot categorie-icoon", async () => {
    const state = mountMap();
    mapIssues.value[0].legend = { icon: "mdi-bike", icon_data_url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'/>", color: "red" };
    await nextTick();
    const styles: Style[] = wrapper.getComponent(LayerStub).props("style")(state.feature);
    const ring = styles[0]!.getImage() as Circle;
    const iconBorder = styles.at(-1)!.getImage() as Circle;
    expect(ring.getRadius()).toBeGreaterThan(iconBorder.getRadius());
  });

  it("schakelt bewerken uit tijdens tekenen en zolang een andere vorm nog laadt", async () => {
    mountMap();
    editing.value = true;
    await nextTick();
    expect(wrapper.findComponent(ModifyStub).exists()).toBe(true);
    drawing.value = true;
    await nextTick();
    expect(wrapper.findComponent(ModifyStub).exists()).toBe(false);
    drawing.value = false;
    selectedId.value = 2;
    await nextTick();
    expect(wrapper.findComponent(ModifyStub).exists()).toBe(false);
    const next = new Feature({ id: 2, geometry: new Point([6.1, 52.1]) });
    source.addFeature(next);
    issue.value = { id: 2, geometry: { type: "Point", coordinates: [6.1, 52.1] } };
    await nextTick();
    expect(wrapper.getComponent(ModifyStub).props("features").getArray()).toEqual([next]);
  });

  it("zet de aangepaste kaartgeometrie om naar de bewerkte onderwerpgegevens", async () => {
    const state = mountMap();
    editing.value = true;
    await nextTick();
    state.feature.getGeometry()!.setCoordinates(fromLonLat([7, 53]) as never);
    wrapper.getComponent(ModifyStub).vm.$emit("modifyend", { features: new Collection([state.feature]) });
    expect(issue.value.geometry.coordinates[0]).toBeCloseTo(7);
    expect(issue.value.geometry.coordinates[1]).toBeCloseTo(53);
    expect(mapIssues.value[0].geometry.coordinates).toEqual([6, 52]);
  });

  it("opent bewerken met dubbelklik en blokkeert de zoomactie", async () => {
    const state = mountMap();
    const event = await state.doubleClickMap(state.feature);
    expect(editing.value).toBe(true);
    expect(event.propagationStopped).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("laat dubbelklik op lege kaartgrond ongemoeid", async () => {
    const state = mountMap();
    const event = await state.doubleClickMap();
    expect(editing.value).toBe(false);
    expect(event.propagationStopped).not.toBe(true);
  });

  it.each(["uitgelogd", "offline", "vergrendeld", "tekenen"])("start geen bewerking bij %s", async condition => {
    const state = mountMap();
    if (condition === "uitgelogd") authenticated.value = "unauthenticated";
    if (condition === "offline") connected.value = false;
    if (condition === "vergrendeld") isLocked.mockReturnValue(true);
    if (condition === "tekenen") drawing.value = true;
    await state.doubleClickMap(state.feature);
    expect(editing.value).toBe(false);
  });

  it("wacht bij een andere vorm op de bijbehorende onderwerpgegevens", async () => {
    const state = mountMap();
    const second = new Feature({ id: 2, geometry: new Point([6.1, 52.1]) });
    source.addFeature(second);
    await state.doubleClickMap(second);
    expect(selectedId.value).toBe(2);
    expect(editing.value).toBe(false);
    issue.value = { id: 2, geometry: { type: "Point", coordinates: [6.1, 52.1] } };
    await nextTick();
    expect(editing.value).toBe(true);
  });
});

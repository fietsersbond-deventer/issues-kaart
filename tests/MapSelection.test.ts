// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount, type VueWrapper } from "@vue/test-utils";
import { computed, defineComponent, nextTick, ref, shallowRef, useTemplateRef, watch } from "vue";
import Feature from "ol/Feature";
import VectorSource from "ol/source/Vector";
import Select from "ol/interaction/Select";
import { click } from "ol/events/condition";
import { Point, LineString, Polygon } from "ol/geom";
import IssueLayer from "../app/components/map/IssueLayer.vue";
import { useMapIssueInteractions } from "../app/composables/useMapIssueInteractions";
import MapComponent from "../app/components/Map.client.vue";
import { useEditableMapFeatures } from "../app/composables/useEditableMapFeatures";

const SelectStub = defineComponent({ name: "OlInteractionSelect", emits: ["select"], template: "<div />" });
const MapStub = defineComponent({ name: "OlMap", template: "<div><slot /></div>" });
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

function mountMap(geometry: Point | LineString | Polygon = new Point([6, 52])) {
  const feature = new Feature({ id: 1, geometry });
  source.addFeature(feature);
  issue.value = { id: 1, title: "Onderwerp", geometry: { type: geometry.getType(), coordinates: geometry.getCoordinates() } };
  mapIssues.value = [JSON.parse(JSON.stringify(issue.value))];
  wrapper = shallowMount(MapComponent, {
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        MapIssueLayer: IssueLayer, "ol-map": MapStub, "ol-view": true, "ol-tile-layer": true,
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
        MapBaseLayers: true, MapControlContainer: true, MapResetExtentControl: true, MapFilterSummary: true,
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
  return { feature, select, clickMap };
}

beforeEach(() => {
  vi.clearAllMocks();
  source = new VectorSource();
  editing = ref(false);
  drawing = ref(false);
  selectedId = ref(1);
  issue = ref(null);
  mapIssues = ref([]);
  for (const [name, value] of Object.entries({ ref, computed, watch, nextTick, shallowRef, useTemplateRef, useEditableMapFeatures, useMapIssueInteractions })) vi.stubGlobal(name, value);
  vi.stubGlobal("storeToRefs", (store: unknown) => store);
  vi.stubGlobal("useSelectedIssue", () => ({ issue, selectedId }));
  vi.stubGlobal("useSelectedIssues", () => ({ selectedIssues: mapIssues }));
  vi.stubGlobal("useRoute", () => ({ query: { tag: "fiets" } }));
  vi.stubGlobal("useMapLayerPreference", () => ({ preferredLayer: ref("Licht"), watchLayerVisibility: vi.fn() }));
  vi.stubGlobal("useVDisplay", () => ({ mobile: ref(false) }));
  vi.stubGlobal("useIsEditing", () => ({ isEditing: editing }));
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
    editing.value = true;
    await nextTick();
    await state.clickMap();
    expect(selectedId.value).toBe(1);
    expect(wrapper.getComponent(ModifyStub).props("features").getArray()).toEqual([state.feature]);
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

});

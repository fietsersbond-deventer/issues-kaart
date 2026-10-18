// @vitest-environment jsdom
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { mount,type VueWrapper } from "@vue/test-utils";
import { computed,defineComponent,nextTick,ref,useTemplateRef,watch } from "vue";
import { Collection,Feature } from "ol";
import { Point,LineString,Polygon } from "ol/geom";
import { fromLonLat } from "ol/proj";
import type { Circle,Icon,Style } from "ol/style";
import IssueLayer from "../app/components/map/IssueLayer.vue";
import { useMapIssueInteractions } from "../app/composables/useMapIssueInteractions";
import BaseLayers from "../app/components/map/BaseLayers.vue";
import IssueMap from "../app/components/Map.client.vue";
import type { MapIssue,Issue } from "../shared/types/Issue";

const point: Issue["geometry"]={ type: "Point",coordinates: [6,52] };
const line: Issue["geometry"]={ type: "LineString",coordinates: [[6,52],[6.1,52.1]] };
const polygon: Issue["geometry"]={ type: "Polygon",coordinates: [[[6,52],[6.1,52],[6,52.1],[6,52]]] };
function issue(id=1,geometry=point): MapIssue {
  return {
    id,title: "Onderwerp",geometry,tags: [],imageUrl: null,legend_id: 1,
    legend: { id: 1,name: "Categorie",color: "#123456",description: "",created_at: "2026-01-01" }
  };
}
const selectedId=ref<number|null>(null);
const selectedIssue=ref<MapIssue|null>(null);
const selectedIssues=ref<MapIssue[]>([]);
const mobile=ref(false);
const editing=ref(false);
const drawing=ref(false);
const zoom=ref(14);
const height=ref(600);
const width=ref(800);
const preferredLayer=ref("Licht");
const refit=vi.fn();
const navigate=vi.fn();
const query={ tag: "veilig",cat: "1" };
let padding: { value: number[] };
let focusMapSize: { value: [number, number] };
let wrapper: VueWrapper;
const Container=defineComponent({ template: "<div><slot /></div>" });
const FeatureStub=defineComponent({ props: ["properties"],template: "<div><slot /></div>" });
const Tile=defineComponent({ props: ["title","visible","baseLayer"],template: "<div><slot /></div>" });
const Vector=defineComponent({ props: ["style"],template: "<div><slot /></div>" });
const Select=defineComponent({ props: ["style","layers","hitTolerance","condition"],emits: ["select"],template: "<div />" });
const Modify=defineComponent({ props: ["features"],emits: ["modifyend"],template: "<div />" });
const PointStub=defineComponent({ props: ["coordinates"],template: "<div />" });
const LineStub=defineComponent({ props: ["coordinates"],template: "<div />" });
const PolygonStub=defineComponent({ props: ["coordinates"],template: "<div />" });
const AddFeature=defineComponent({
  setup(_,{ expose }) {
    expose({ isDrawing: drawing });
    return () => null;
  }
});
const Size=defineComponent({ props: ["modelValue"],emits: ["update:modelValue"],template: "<div><slot /></div>" });
const Tooltip=defineComponent({ props: ["isDrawing"],template: "<div />" });
const Reset=defineComponent({ emits: ["reset"],template: "<button @click=\"$emit('reset')\" />" });

function mountMap(withSlots=false) {
  wrapper=mount(IssueMap,{
    slots: withSlots? { "top-left-controls": "<b>Top</b>","bottom-left-controls": ({ mapWidth }: { mapWidth: number }) => `Width ${mapWidth}` }:{},
    global: {
      components: { MapBaseLayers: BaseLayers, MapIssueLayer: IssueLayer },
      stubs: {
        "ol-map": Container,"ol-view": true,MapControlContainer: Container,MapResetExtentControl: Reset,
        MapFilterSummary: true,SizeCalculator: Size,MapAddFeature: AddFeature,
        "ol-tile-layer": Tile,"ol-source-xyz": true,"ol-source-wmts": true,
        "ol-vector-layer": Vector,"ol-source-vector": Container,"ol-feature": FeatureStub,
        "ol-geom-point": PointStub,"ol-geom-line-string": LineStub,"ol-geom-polygon": PolygonStub,
        "ol-interaction-modify": Modify,MapAreas: true,"ol-attribution-control": true,
        MapTooltip: Tooltip,"ol-interaction-select": Select,
      }
    },
  });
}
function feature(id: number,geometry=new Point(fromLonLat([6,52]))) {
  return new Feature({ id,geometry });
}
function styles(f: Feature): Style[] {
  const result=wrapper.getComponent(Vector).props("style")(f);
  return result? (Array.isArray(result)? result:[result]):[];
}

beforeEach(() => {
  vi.clearAllMocks();
  selectedId.value=null;
  selectedIssue.value=null;
  selectedIssues.value=[issue()];
  mobile.value=false;
  editing.value=false;
  drawing.value=false;
  zoom.value=14;
  height.value=600;
  width.value=800;
  preferredLayer.value="Licht";
  for(const [name,value] of Object.entries({ ref,computed,watch,useTemplateRef })) vi.stubGlobal(name,value);
  vi.stubGlobal("storeToRefs",(store: unknown) => store);
  vi.stubGlobal("useMapIssueInteractions", useMapIssueInteractions);
  vi.stubGlobal("useSelectedIssue",() => ({ issue: selectedIssue,selectedId }));
  vi.stubGlobal("useSelectedIssues",() => ({ selectedIssues }));
  vi.stubGlobal("useRoute",() => ({ query }));
  vi.stubGlobal("navigateTo",navigate);
  vi.stubGlobal("useMapLayerPreference",() => ({ preferredLayer,watchLayerVisibility: vi.fn() }));
  vi.stubGlobal("useVDisplay",() => ({ mobile }));
  vi.stubGlobal("useIsEditing",() => ({ isEditing: editing }));
  vi.stubGlobal("useMapView",() => ({ zoom }));
  vi.stubGlobal("useMapResize",() => ({ mapHeight: height,mapWidth: width }));
  vi.stubGlobal("useMapFocus",(_map: unknown,p: typeof padding, size: typeof focusMapSize) => {
    focusMapSize = size;
    padding=p;
    return { refit };
  });
});
afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
});

describe("kaartcontract vóór opsplitsing",() => {
  it("rendert geometrieën in Web Mercator en behoudt feature-eigenschappen",() => {
    selectedIssues.value=[issue(1),issue(2,line),issue(3,polygon)];
    mountMap();
    expect(wrapper.findAllComponents(FeatureStub).map(w => w.props("properties"))).toEqual(
      selectedIssues.value.map(({ geometry: _geometry,...properties }) => properties),
    );
    expect(wrapper.getComponent(PointStub).props("coordinates")).toEqual(fromLonLat([6,52]));
    expect(wrapper.getComponent(LineStub).props("coordinates")).toEqual([[6,52],[6.1,52.1]].map(c => fromLonLat(c)));
    expect(wrapper.getComponent(PolygonStub).props("coordinates")).toEqual([polygon.coordinates[0]!.map(c => fromLonLat(c))]);
  });

  it("behoudt laagvolgorde en koppelt straatnamen aan de fotolaag",async () => {
    mountMap();
    const layers=wrapper.findAllComponents(Tile);
    expect(layers.map(w => w.props("title"))).toEqual(["Licht","Fiets","Foto","Straatnamen"]);
    expect(layers.map(w => w.props("visible"))).toEqual([true,false,false,false]);
    preferredLayer.value="Foto";
    await nextTick();
    expect(layers.map(w => w.props("visible"))).toEqual([false,false,true,true]);
    preferredLayer.value="Fiets";
    await nextTick();
    expect(layers.map(w => w.props("visible"))).toEqual([false,true,false,false]);
  });

  it("behoudt bronnen, attributie en RD-projectie", () => {
    mountMap();
    const xyz = wrapper.findAll("ol-source-xyz-stub");
    expect(xyz[0]!.attributes("url")).toContain("cartodb-basemaps");
    expect(xyz[0]!.attributes("attributions")).toContain("CARTO");
    expect(xyz[1]!.attributes("url")).toContain("tile-cyclosm");
    expect(xyz[1]!.attributes("attributions")).toContain("OpenStreetMap");
    const wmts = wrapper.findAll("ol-source-wmts-stub");
    expect(wmts.map(w => w.attributes("layer"))).toEqual(["Actueel_ortho25", "labels"]);
    expect(wmts[0]!.attributes("attributions")).toContain("Kadaster");
    expect(wmts.map(w => w.attributes("url"))).toEqual([
      "https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0?TILEMATRIXSET=EPSG:28992",
      "https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0?TILEMATRIXSET=EPSG:28992",
    ]);
    expect(wrapper.findAllComponents(Tile).map(w => w.props("baseLayer"))).toEqual([true, true, true, undefined]);
  });

  it("volgt wijzigingen in de gefilterde onderwerpen",async () => {
    mountMap();
    selectedIssues.value=[issue(2,line)];
    await nextTick();
    expect(wrapper.findComponent(PointStub).exists()).toBe(false);
    expect(wrapper.findAllComponents(FeatureStub)).toHaveLength(1);
    expect(styles(feature(1))).toEqual([]);
  });

  it("behoudt slots, publieke API en resetopties",async () => {
    mountMap(true);
    expect(wrapper.text()).toContain("Top");
    expect(wrapper.text()).toContain("Width 800");
    const api=wrapper.vm as unknown as {
      refit: typeof refit;
      resetToOriginalExtent: () => void;
      preferredLayer: string
    };
    expect(api.refit).toBe(refit);
    expect(api.preferredLayer).toBe("Licht");
    api.resetToOriginalExtent();
    expect(refit).toHaveBeenLastCalledWith({ overview: true,duration: 1000 });
    await wrapper.getComponent(Reset).trigger("click");
    expect(refit).toHaveBeenCalledTimes(2);
    wrapper.getComponent(Size).vm.$emit("update:modelValue",{ width: 100,height: 300 });
    await nextTick();
    expect(padding.value).toEqual([100,50,50,150]);
    wrapper.getComponent(Size).vm.$emit("update:modelValue",{ width: 400,height: 120 });
    await nextTick();
    expect(padding.value).toEqual([100,50,170,50]);
  });

  it("behoudt de publieke refit en gedeelde laagvoorkeur zonder optionele slots", async () => {
    mountMap();
    expect(wrapper.findComponent(Size).exists()).toBe(false);
    const api = wrapper.vm as unknown as {
      refit: typeof refit;
      preferredLayer: string;
    };
    api.refit({ overview: true });
    expect(refit).toHaveBeenCalledWith({ overview: true });
    preferredLayer.value = "Foto";
    await nextTick();
    expect(api.preferredLayer).toBe("Foto");
    api.preferredLayer = "Fiets";
    await nextTick();
    expect(preferredLayer.value).toBe("Fiets");
    expect(wrapper.findAllComponents(Tile).map(w => w.props("visible"))).toEqual([false, true, false, false]);
  });

  it("leest de exposed drawing-status direct bij mount", async () => {
    drawing.value = true;
    mountMap();
    await nextTick();
    expect(wrapper.findComponent(Select).exists()).toBe(false);
    expect(wrapper.getComponent(Tooltip).props("isDrawing")).toBe(true);
    drawing.value = false;
    await nextTick();
    expect(wrapper.findComponent(Select).exists()).toBe(true);
    expect(wrapper.getComponent(Tooltip).props("isDrawing")).toBe(false);
  });

  it("geeft de actuele kaartafmetingen door aan de bestaande focus-composable", () => {
    mountMap();
    expect(focusMapSize.value).toEqual([800, 600]);
    width.value = 360;
    height.value = 240;
    expect(focusMapSize.value).toEqual([360, 240]);
  });

  it("selecteert met querybehoud en meldt alleen een nieuw onderwerp",async () => {
    mountMap();
    const select=wrapper.getComponent(Select);
    expect(select.props("hitTolerance")).toBe(5);
    expect(select.props("layers")({ getClassName: () => "area-layer" })).toBe(false);
    expect(select.props("layers")({ getClassName: () => "issues" })).toBe(true);
    select.vm.$emit("select",{ selected: [feature(1)] });
    expect(selectedId.value).toBe(1);
    expect(navigate).toHaveBeenCalledWith({ path: "/kaart/1",query });
    expect(wrapper.emitted("feature-clicked")).toEqual([[]]);
    selectedIssue.value=issue();
    editing.value=true;
    await nextTick();
    const f=feature(1);
    select.vm.$emit("select",{ selected: [f] });
    const collection=wrapper.getComponent(Modify).props("features") as Collection<Feature>;
    expect(collection.getArray()).toEqual([f]);
    expect(navigate).toHaveBeenCalledTimes(1);
    select.vm.$emit("select",{ selected: [] });
    expect(collection.getLength()).toBe(0);
    mobile.value=true;
    await nextTick();
    expect(select.props("hitTolerance")).toBe(15);
  });

  it("schakelt selectie uit tijdens tekenen en bewerken vereist een onderwerp",async () => {
    mountMap();
    expect(wrapper.findComponent(Modify).exists()).toBe(false);
    editing.value=true;
    await nextTick();
    expect(wrapper.findComponent(Modify).exists()).toBe(false);
    selectedIssue.value=issue();
    await nextTick();
    expect(wrapper.findComponent(Modify).exists()).toBe(true);
    drawing.value=true;
    await nextTick();
    expect(wrapper.findComponent(Select).exists()).toBe(false);
    expect(wrapper.getComponent(Tooltip).props("isDrawing")).toBe(true);
    drawing.value=false;
    await nextTick();
    expect(wrapper.findComponent(Select).exists()).toBe(true);
  });

  it.each([point,line,polygon])("werkt beide geometrieën bij na bewerken van $type",async geometry => {
    selectedIssue.value=issue(1,geometry);
    selectedId.value=1;
    editing.value=true;
    mountMap();
    const coordinates=geometry.type==="Point"? new Point(geometry.coordinates):geometry.type==="LineString"? new LineString(geometry.coordinates):new Polygon(geometry.coordinates);
    coordinates.transform("EPSG:4326","EPSG:3857");
    wrapper.getComponent(Modify).vm.$emit("modifyend",{ features: new Collection([new Feature(coordinates)]) });
    expect(selectedIssue.value.geometry?.type).toBe(geometry.type);
    expect(selectedIssues.value[0]!.geometry).toEqual(selectedIssue.value.geometry);
    const first=selectedIssue.value.geometry!;
    const actual=first.type==="Point"? first.coordinates:first.type==="LineString"? first.coordinates[0]!:first.coordinates[0]![0]!;
    expect(actual[0]).toBeCloseTo(6);
    expect(actual[1]).toBeCloseTo(52);
  });

  it("negeert een leeg modify-event",() => {
    selectedIssue.value=issue();
    editing.value=true;
    mountMap();
    const warn=vi.spyOn(console,"warn").mockImplementation(() => { });
    wrapper.getComponent(Modify).vm.$emit("modifyend",{ features: new Collection() });
    expect(selectedIssue.value.geometry).toEqual(point);
    expect(warn).toHaveBeenCalledWith("No feature modified");
    warn.mockRestore();
  });

  it("past compacte kaartklassen alleen toe op mobiel",async () => {
    mountMap();
    height.value=window.innerHeight*0.3;
    await nextTick();
    expect(wrapper.classes()).not.toContain("map-small");
    mobile.value=true;
    await nextTick();
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["map-small","map-very-small"]));
    height.value=window.innerHeight*0.4;
    await nextTick();
    expect(wrapper.classes()).toContain("map-small");
    expect(wrapper.classes()).not.toContain("map-very-small");
    height.value=0;
    await nextTick();
    expect(wrapper.classes()).not.toContain("map-small");
  });
});

describe("kaartstyling vóór opsplitsing",() => {
  it.each([false,true])("tekent een standaardpunt, geselecteerd=%s",selected => {
    selectedId.value=selected? 1:null;
    mountMap();
    const s=styles(feature(1))[0]!;
    const image=s.getImage() as Circle;
    expect(image.getRadius()).toBe(8);
    expect(image.getFill()!.getColor()).toBe("#123456");
    expect(image.getStroke()!.getColor()).toBe(selected? "black":"white");
    expect(s.getZIndex()).toBe(selected? 1000:1);
  });

  it.each([8,14,20])("schaalt en begrenst iconen en fallbackcirkels bij zoom %s",value => {
    zoom.value=value;
    const item=issue();
    item.legend.icon="mdi-bike";
    selectedIssues.value=[item];
    mountMap();
    const radius=Math.max(3,Math.min(7,3+(value-10)/2));
    expect((styles(feature(1))[0]!.getImage() as Circle).getRadius()).toBe(radius);
    selectedId.value=1;
    expect((styles(feature(1))[1]!.getImage() as Circle).getRadius()).toBe(3+(value-10)/2+3);
    selectedIssues.value[0]!.legend.icon_data_url="data:image/png;base64,aGVsbG8=";
    const result=styles(feature(1));
    const scale=Math.max(0.3,Math.min(0.7,0.3+(value-10)/8*0.4));
    expect((result[0]!.getImage() as Icon).getScale()).toBeCloseTo(scale);
    expect((result[1]!.getImage() as Circle).getRadius()).toBeCloseTo(Math.max(6,32*scale+1));
    selectedId.value=null;
    expect(styles(feature(1))).toHaveLength(1);
  });

  it.each([false,true])("tekent lijnen en polygonen, geselecteerd=%s",selected => {
    selectedId.value=selected? 1:null;
    mountMap();
    const lineStyles=styles(new Feature({ id: 1,geometry: new LineString([[0,0],[1,1]]) }));
    expect(lineStyles.map(s => s.getStroke()!.getWidth())).toEqual(selected? [8,6]:[3]);
    expect(lineStyles.map(s => s.getStroke()!.getColor())).toEqual(selected? ["black","#123456"]:["#123456"]);
    const polyStyle=styles(new Feature({ id: 1,geometry: new Polygon([[[0,0],[1,0],[0,0]]]) }))[0]!;
    expect(polyStyle.getStroke()!.getColor()).toBe(selected? "black":"#123456");
    expect(polyStyle.getFill()!.getColor()).toBe("rgba(18, 52, 86, 0.5)");
  });
});

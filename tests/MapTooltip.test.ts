// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { computed, inject, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import MapTooltips from "../app/components/map/MapTooltips.vue";

const Overlay = {
  props: ["position"],
  template: '<div data-test="overlay"><slot /></div>',
};
const Tag = {
  props: ["tag"],
  template: '<span data-test="tag">{{ tag.name || tag.label }}</span>',
};

let wrapper: VueWrapper;
type PointerListener = (event: { pixel: unknown[] }) => void;
let listener: PointerListener | undefined;
let editing: ReturnType<typeof ref<boolean>>;
const target = { style: { cursor: "" } };
const getTag = vi.fn();
const map = {
  on: vi.fn(),
  un: vi.fn(),
  getFeaturesAtPixel: vi.fn(),
  getCoordinateFromPixel: vi.fn(),
  getTargetElement: vi.fn<() => typeof target | undefined>(),
};

function mountTooltip(isDrawing = false, withMap = true) {
  wrapper = mount(MapTooltips, {
    props: { isDrawing },
    global: {
      provide: { map: withMap ? map : undefined },
      stubs: { "ol-overlay": Overlay, Tag },
    },
  });
  listener = map.on.mock.calls[0]?.[1];
}

function movePointer(pixel: unknown[] = [30, 40]) {
  if (!listener) {
    throw new Error("MapTooltip heeft geen pointermove-listener geregistreerd");
  }
  listener({ pixel });
}

async function hover(
  properties = {
    title: "Route",
    imageUrl: "/photo.jpg",
    tags: ["known", "unknown"],
  },
  pixel: unknown[] = [30, 40],
) {
  map.getFeaturesAtPixel.mockReturnValue([{ getProperties: () => properties }]);
  movePointer(pixel);
  await nextTick();
}

beforeEach(() => {
  vi.resetAllMocks();
  listener = undefined;
  map.getTargetElement.mockReturnValue(target);
  target.style.cursor = "";
  editing = ref(false);
  getTag.mockImplementation((slug: string) =>
    slug === "known" ? { name: "Known tag" } : undefined,
  );
  map.getCoordinateFromPixel.mockReturnValue([6, 52]);
  for (const [name, value] of Object.entries({
    ref,
    shallowRef,
    inject,
    onMounted,
    onUnmounted,
    computed,
    watch,
  })) {
    vi.stubGlobal(name, value);
  }
  vi.stubGlobal("useTagsApi", () => ({ getTag }));
  vi.stubGlobal("useIsEditing", () => ({ isEditing: editing }));
});

afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
});

describe("MapTooltip bestaand gedrag", () => {
  it("toont bij een cluster het aantal en bij één punt het onderwerp", async () => {
    mountTooltip();
    const single = {
      getProperties: () => ({ title: "Fietsroute", imageUrl: "", tags: [], legend: { name: "Fietsroutes" } }),
      get: (name: string) => name === "legend" ? { name: "Fietsroutes" } : name === "title" ? "Fietsroute" : undefined,
    };
    const other = { ...single, get: (name: string) => name === "title" ? "Parkeerplaats" : single.get(name) };
    await hover({ features: [single, other] } as never);
    expect(wrapper.text()).toContain("2 punten");
    expect(wrapper.text()).toContain("Fietsroutes");
    expect(wrapper.findAll("ul li").map(item => item.text())).toEqual(["Fietsroute", "Parkeerplaats"]);
    expect(wrapper.findAll('[data-test="tag"]')).toHaveLength(0);
    await hover({ features: [single] } as never);
    expect(wrapper.text()).toContain("Fietsroute");
  });
  it("toont inhoud zonder cursorwijziging wanneer het kaartdoel ontbreekt", async () => {
    mountTooltip();
    map.getTargetElement.mockReturnValue(undefined);
    await hover();
    expect(wrapper.text()).toContain("Route");
    expect(wrapper.find('[data-test="overlay"]').exists()).toBe(true);
  });

  it("toont maximaal drie tags, met een teller bij meer dan drie", async () => {
    mountTooltip();
    getTag.mockImplementation((slug: string) => ({ tag: slug, name: slug }));
    await hover({ title: "Route", imageUrl: "", tags: ["a", "b", "c"] });
    expect(wrapper.findAll('[data-test="tag"]').map(tag => tag.text())).toEqual(["a", "b", "c"]);
    await hover({ title: "Route", imageUrl: "", tags: ["a", "b", "c", "d"] });
    expect(wrapper.findAll('[data-test="tag"]').map(tag => tag.text())).toEqual(["a", "b", "+ 2"]);
  });

  it("registreert en verwijdert dezelfde muisbewegingslistener", () => {
    mountTooltip();
    expect(map.on).toHaveBeenCalledWith("pointermove", expect.any(Function));
    wrapper.unmount();
    expect(map.un).toHaveBeenCalledWith("pointermove", listener);
  });

  it("registreert geen listener als de kaart ontbreekt", () => {
    mountTooltip(false, false);
    expect(map.on).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(map.un).not.toHaveBeenCalled();
  });

  it("toont onderwerpinhoud en bekende tags boven de muisaanwijzer", async () => {
    mountTooltip();
    await hover();
    expect(wrapper.text()).toContain("Route");
    expect(wrapper.get("img").attributes("src")).toBe("/photo.jpg?width=300&height=300");
    expect(
      wrapper.findAll('[data-test="tag"]').map(tag => tag.text()),
    ).toEqual(["Known tag"]);
    expect(getTag.mock.calls).toEqual([["known"], ["unknown"]]);
    expect(target.style.cursor).toBe("pointer");
    expect(map.getCoordinateFromPixel).toHaveBeenCalledWith([30, 25]);
    expect(wrapper.getComponent(Overlay).props("position")).toEqual([6, 52]);
    const options = map.getFeaturesAtPixel.mock.calls[0][1];
    expect(options.hitTolerance).toBe(3);
    expect(options.layerFilter({ getClassName: () => "area-layer" })).toBe(false);
    expect(options.layerFilter({ getClassName: () => "issues" })).toBe(true);
  });

  it("gebruikt standaardwaarden en wist oude tags en afbeeldingen bij een ander onderwerp", async () => {
    mountTooltip();
    await hover();
    await hover({ title: "", imageUrl: "", tags: [] });
    expect(wrapper.text()).toContain("Geen titel");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.findAll('[data-test="tag"]')).toHaveLength(0);
  });

  it.each([
    [undefined, 40],
    [30, undefined],
  ])(
    "behoudt de vorige positie bij ongeldige pixelcoördinaat %j",
    async (x, y) => {
      mountTooltip();
      await hover();
      map.getCoordinateFromPixel.mockClear();
      await hover(undefined, [x, y]);
      expect(map.getCoordinateFromPixel).not.toHaveBeenCalled();
      expect(wrapper.getComponent(Overlay).props("position")).toEqual([6, 52]);
    },
  );

  it.each([{ features: [] }, { features: undefined }])(
    "wist de tooltip en cursor als er geen onderwerp is gevonden ($features)",
    async ({ features }) => {
      mountTooltip();
      await hover();
      map.getFeaturesAtPixel.mockReturnValue(features);
      movePointer();
      await nextTick();
      expect(wrapper.find('[data-test="overlay"]').exists()).toBe(false);
      expect(target.style.cursor).toBe("");
    },
  );

  it("verbergt tooltips en slaat onderwerpdetectie over tijdens tekenen", async () => {
    mountTooltip();
    await hover();
    await wrapper.setProps({ isDrawing: true });
    map.getFeaturesAtPixel.mockClear();
    movePointer();
    await nextTick();
    expect(map.getFeaturesAtPixel).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="overlay"]').exists()).toBe(false);
    await wrapper.setProps({ isDrawing: false });
    expect(wrapper.find('[data-test="overlay"]').exists()).toBe(false);
  });
});

describe("MapTooltip regressies bij interactie", () => {
  it.each(["bewerken", "tekenen"])(
    "wist de tooltip zodra %s begint en toont deze pas na opnieuw aanwijzen",
    async mode => {
      mountTooltip();
      await hover();
      map.getFeaturesAtPixel.mockClear();
      if (mode === "bewerken") editing.value = true;
      else await wrapper.setProps({ isDrawing: true });
      await nextTick();
      expect(wrapper.find('[data-test="overlay"]').exists()).toBe(false);
      expect(target.style.cursor).toBe("");
      movePointer();
      expect(map.getFeaturesAtPixel).not.toHaveBeenCalled();
      if (mode === "bewerken") editing.value = false;
      else await wrapper.setProps({ isDrawing: false });
      await nextTick();
      expect(wrapper.find('[data-test="overlay"]').exists()).toBe(false);
      await hover({ title: "Fresh hover", imageUrl: "", tags: [] });
      expect(wrapper.text()).toContain("Fresh hover");
      expect(wrapper.find("img").exists()).toBe(false);
      expect(wrapper.findAll('[data-test="tag"]')).toHaveLength(0);
      expect(target.style.cursor).toBe("pointer");
    },
  );

  it("verbergt tooltips bij starten in bewerkmodus en na tekenen binnen bewerkmodus", async () => {
    editing.value = true;
    mountTooltip(true);
    await wrapper.setProps({ isDrawing: false });
    await hover();
    expect(map.getFeaturesAtPixel).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="overlay"]').exists()).toBe(false);
  });
});

describe("MapTooltip wissen zonder kaartelement", () => {
  it("wist de tooltip als het kaartelement wegvalt", async () => {
    mountTooltip();
    await hover();
    map.getTargetElement.mockReturnValue(undefined);

    editing.value = true;
    await nextTick();
    expect(wrapper.find('[data-test="overlay"]').exists()).toBe(false);

    editing.value = false;
    await nextTick();
    expect(wrapper.find('[data-test="overlay"]').exists()).toBe(false);

    map.getTargetElement.mockReturnValue(target);
    await hover();
    expect(wrapper.text()).toContain("Route");
  });

  it("kan bewerken starten en stoppen zonder geïnjecteerde kaart", async () => {
    mountTooltip(false, false);
    editing.value = true;
    await nextTick();
    editing.value = false;
    await nextTick();
    expect(wrapper.find('[data-test="overlay"]').exists()).toBe(false);
  });
});

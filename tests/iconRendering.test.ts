// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Field, uiStubs } from "./helpers/ui";
import ValidatedIcon from "../app/components/ValidatedIcon.vue";
import IconSelector from "../app/components/IconSelector.vue";
const loadIcon = vi.hoisted(() => vi.fn());
const loadQuill = vi.hoisted(() => vi.fn());
vi.mock("@iconify/vue", () => ({ loadIcon }));
vi.mock("@vueup/vue-quill", () => ({ loadQuill }));
const Tooltip = defineComponent({ template: '<div><slot name="activator" :props="{}" /><slot /></div>' });
const wrappers: Array<{
    unmount(): void;
}> = [];
beforeEach(() => { vueGlobals(); vi.useFakeTimers(); vi.spyOn(console, "warn").mockImplementation(() => { }); vi.spyOn(console, "error").mockImplementation(() => { }); });
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("validates MDI glyphs, signals missing glyphs and supports Iconify without CSS probing", async () => {
    const style = vi.spyOn(window, "getComputedStyle").mockReturnValue({ getPropertyValue: () => '"glyph"' } as CSSStyleDeclaration);
    const wrapper = mount(ValidatedIcon, { props: { icon: "bike" }, global: { stubs: { VIcon: true, Icon: true } } });
    wrappers.push(wrapper);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(101);
    expect(wrapper.vm.isValid).toBe(true);
    expect(document.querySelector("i.mdi")).toBeNull();
    style.mockReturnValue({ getPropertyValue: () => "none" } as CSSStyleDeclaration);
    await wrapper.setProps({ icon: "mdi-missing" });
    await vi.advanceTimersByTimeAsync(101);
    expect(wrapper.emitted("iconNotFound")?.at(-1)).toEqual(["mdi-missing"]);
    expect(wrapper.vm.showingFallback).toBe(true);
    await wrapper.setProps({ icon: "tabler:bike" });
    expect(wrapper.findComponent({ name: "Icon" }).exists()).toBe(true);
});
it("loads icon metadata, filters/searches, toggles selections and removes known missing icons", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => Array.from({ length: 40 }, (_, i) => ({ name: `bike-${i}`, tags: [i % 2 ? "bike" : "transport"], aliases: ["cycle"] })) }));
    const remote = vi.fn().mockResolvedValue({ icons: ["mdi:bike-1", "tabler:bike"] });
    vi.stubGlobal("$fetch", remote);
    const Icon = defineComponent({ name: "IconBoundary", props: ["icon"], emits: ["icon-not-found"], template: '<span>{{ icon }}</span>' });
    const wrapper = mount(IconSelector, { props: { modelValue: undefined }, global: { stubs: { ...uiStubs, VSelect: Field, VTooltip: Tooltip, VPagination: Field, VProgressCircular: true, ValidatedIcon: Icon } } });
    wrappers.push(wrapper);
    await flushPromises();
    expect(wrapper.findAll("button")).toHaveLength(32);
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["mdi-bike-0"]);
    await wrapper.setProps({ modelValue: "mdi-bike-0" });
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([undefined]);
    await wrapper.get("input").setValue("tabler:bike");
    await vi.advanceTimersByTimeAsync(301);
    await flushPromises();
    expect(remote).toHaveBeenCalled();
    expect(wrapper.text()).toContain("tabler:bike");
    wrapper.findAllComponents(Icon)[0]!.vm.$emit("icon-not-found", "tabler:bike");
    await flushPromises();
    expect(wrapper.findAllComponents(Icon).map((c) => c.props("icon"))).not.toContain("tabler:bike");
    await wrapper.get("input").setValue("");
    await flushPromises();
    expect(wrapper.findAll("button")).toHaveLength(32);
});
it("renders an icon in a canvas with aspect ratio preserved and reports load failures", async () => {
    vi.stubGlobal("getContrastColor", () => "white");
    loadIcon.mockResolvedValue({ width: 32, height: 16, body: '<path d="" />' });
    const drawImage = vi.fn();
    const context = { scale: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), drawImage, fillStyle: "" };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,test");
    vi.stubGlobal("Image", class {
        onload?: () => void;
        set src(_value: string) { this.onload?.(); }
    });
    const { createIconCanvasDataUrl, createFallbackIconDataUrl } = await import("../app/utils/iconCanvas");
    expect(await createIconCanvasDataUrl("mdi-bike", "#fff")).toBe("data:image/png;base64,test");
    expect(loadIcon).toHaveBeenCalledWith("mdi:bike");
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 7, 11.5, 18, 9);
    expect(createFallbackIconDataUrl("#fff")).toBe("data:image/png;base64,test");
    vi.stubGlobal("Image", class {
        onerror?: () => void;
        set src(_value: string) { this.onerror?.(); }
    });
    await expect(createIconCanvasDataUrl("tabler:bike", "#fff")).rejects.toThrow("Could not render");
});
it("registers one Quill embed type and round-trips stored Street View metadata", async () => {
    const register = vi.fn();
    class Base extends HTMLElement {
        static create() { return document.createElement("div"); }
    }
    loadQuill.mockResolvedValue({ import: () => Base, register });
    const { ensureStreetViewEmbedBlotRegistered } = await import("../app/utils/streetViewEmbedBlot");
    await Promise.all([ensureStreetViewEmbedBlotRegistered(), ensureStreetViewEmbedBlotRegistered()]);
    expect(register).toHaveBeenCalledTimes(1);
    const Blot = register.mock.calls[0]![0];
    const value = { lat: 52, lng: 6, heading: 10, pitch: 1, fov: 90, panoId: "pano", previewDataUrl: "data:preview", embedSrc: "https://embed.example.test" };
    expect(Blot.value(Blot.create(value))).toEqual(value);
    expect(Blot.blotName).toBe("streetviewEmbed");
    expect(Blot.value(document.createElement("div"))).toMatchObject({ panoId: "", previewDataUrl: "", embedSrc: "" });
});

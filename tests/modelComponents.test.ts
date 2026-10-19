// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { vueGlobals } from "./helpers/vue";
import Size from "../app/components/SizeCalculator.vue";
import TagSelect from "../app/components/TagSelect.vue";
const wrappers: Array<{
    unmount(): void;
}> = [];
beforeEach(() => { vueGlobals(); });
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("reports rounded container dimensions on resize and disconnects after unmount", async () => {
    vi.useFakeTimers();
    try {
        const observe = vi.fn(), disconnect = vi.fn();
        let callback: () => void;
        vi.stubGlobal("ResizeObserver", class {
            constructor(fn: () => void) { callback = fn; }
            observe = observe;
            disconnect = disconnect;
        });
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 200.6, height: 99.4 } as DOMRect);
        const wrapper = mount(Size, { props: { modelValue: { width: 0, height: 0 } }, slots: { default: "Content" } });
        wrappers.push(wrapper);
        await vi.advanceTimersByTimeAsync(101);
        expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([{ width: 201, height: 99 }]);
        vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue({ width: 300.2, height: 150.8 } as DOMRect);
        callback!();
        await vi.advanceTimersByTimeAsync(101);
        expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([{ width: 300, height: 151 }]);
        expect(observe).toHaveBeenCalledTimes(1);
        wrapper.unmount();
        expect(disconnect).toHaveBeenCalledTimes(1);
    }
    finally {
        vi.useRealTimers();
    }
});
it("passes tag suggestions and resolves both typed strings and selected item objects", async () => {
    vi.stubGlobal("useTagsApi", () => ({ tags: ref([{ tag: "bike", label: "Bicycle" }, { tag: "safe", label: null }]), getTag: (tag: string) => ({ tag, label: tag }) }));
    const Combo = defineComponent({ name: "ComboBoundary", props: ["items", "modelValue"], emits: ["update:modelValue"], template: '<div><slot name="chip" item="new" :props="{}" /><slot name="item" :item="items[0]" :props="{}" /></div>' });
    const Tag = defineComponent({ props: ["tag"], template: '<span>{{ tag.label }}</span>' });
    const wrapper = mount(TagSelect, { props: { modelValue: [] }, global: { stubs: { VCombobox: Combo, VListItem: defineComponent({ template: '<div><slot name="title" /></div>' }), Tag } } });
    wrappers.push(wrapper);
    expect(wrapper.text()).toContain("new");
    expect(wrapper.text()).toContain("bike");
    expect(wrapper.getComponent(Combo).props("items")).toEqual([{ title: "Bicycle", value: "bike" }, { title: "safe", value: "safe" }]);
    wrapper.getComponent(Combo).vm.$emit("update:modelValue", ["bike"]);
    await flushPromises();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([["bike"]]);
});

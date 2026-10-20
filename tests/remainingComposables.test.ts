// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { vueGlobals } from "./helpers/vue";
import type { Issue } from "../shared/types/Issue";
const wrappers: Array<{
    unmount(): void;
}> = [];
beforeEach(() => { vueGlobals(); });
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("provides and injects a shared map promise and a working map event bus", async () => {
    const { useMap } = await import("../app/composables/useMap");
    const { useMapEventBus } = await import("../app/composables/useMapEventBus");
    const map = Promise.resolve({ id: "map" });
    const listener = vi.fn();
    let injected: unknown;
    const Child = defineComponent({ setup() { injected = useMap().injectMap(); expect(useMap().requestMap()).toBe(map); useMapEventBus().inject()!.on("startPoint", listener); return () => null; } });
    const Parent = defineComponent({ setup() { useMap().provideMap(map as never); const bus = useMapEventBus().provide(); return () => h("button", { onClick: () => bus.emit("startPoint") }, [h(Child), "Draw"]); } });
    const wrapper = mount(Parent);
    wrappers.push(wrapper);
    expect(injected).toBe(map);
    await wrapper.get("button").trigger("click");
    expect(listener).toHaveBeenCalledTimes(1);
});
it("shares the menu state and forwards shared snackbar notifications", async () => {
    const { useMapMenu } = await import("../app/composables/useMapMenu");
    const first = useMapMenu(), second = useMapMenu();
    first.open.value = true;
    expect(second.open.value).toBe(true);
    const showMessage = vi.fn(), showPersistent = vi.fn();
    vi.stubGlobal("useSnackbar", () => ({ showMessage, showPersistent }));
    const { useSharedSnackbar } = await import("../app/composables/useSharedSnackbar");
    const snackbar = useSharedSnackbar();
    snackbar.showMessage("Saved");
    snackbar.showPersistent("Offline");
    snackbar.showPersistent("Other", "info");
    expect(showMessage).toHaveBeenCalledWith("Saved");
    expect(showPersistent.mock.calls).toEqual([["Offline", "warning"], ["Other", "info"]]);
});
it("generates issue metadata, adds images when present and supplies empty-content defaults", async () => {
    let render: () => {
        title: string;
        meta: Array<{
            property?: string;
            name?: string;
            content: string;
        }>;
    };
    vi.stubGlobal("useHead", (callback: typeof render) => { render = callback; });
    vi.stubGlobal("useRequestURL", () => new URL("https://example.test/kaart/1"));
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { organization: { name: "Test Organization" } } }));
    const { useIssueOpenGraph } = await import("../app/composables/useIssueOpenGraph");
    useIssueOpenGraph({ id: 1, title: "Issue", description: "<p>Hello</p>", imageUrl: "/api/issues/1/image" } as Issue);
    expect(render!().meta).toContainEqual({ property: "og:image", content: "https://example.test/api/issues/1/image" });
    expect(render!().meta).toContainEqual({ name: "description", content: "Hello" });
    useIssueOpenGraph({ id: 2, title: "", description: "", imageUrl: null } as Issue);
    expect(render!().title).toBe("Onderwerp");
    expect(render!().meta.find((meta) => meta.property === "og:image")).toBeUndefined();
});

it("keeps tag separators readable while safely encoding other query characters", async () => {
    const { default: router } = await import("../app/router.options");
    expect(router.stringifyQuery({ tag: "bike+safe", search: "A&B" })).toBe("tag=bike+safe&search=A%26B");
});

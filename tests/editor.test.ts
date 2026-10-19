// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Field, Form, uiStubs } from "./helpers/ui";
import type { Issue, NewIssue } from "../shared/types/Issue";
import EditForm from "../app/components/EditForm.client.vue";
vi.mock("@vueup/vue-quill", () => ({ QuillEditor: { name: "QuillEditor", template: "<div />" } }));
vi.mock("quill-image-compress", () => ({ imageCompressor: {} }));
vi.mock("../app/utils/streetViewEmbedBlot", () => ({ ensureStreetViewEmbedBlotRegistered: vi.fn().mockResolvedValue(undefined) }));
const update = vi.fn(), create = vi.fn(), remove = vi.fn(), navigate = vi.fn(), trackEvent = vi.fn(), fetch = vi.fn();
const editing = ref(true), connected = ref(true);
const wrappers: Array<{
    unmount(): void;
}> = [];
const draft = (): NewIssue => ({ title: "Draft", description: "text", tags: [], legend_id: 1, geometry: { type: "Point", coordinates: [6, 52] } });
beforeEach(() => {
    vueGlobals();
    vi.clearAllMocks();
    editing.value = true;
    connected.value = true;
    vi.stubGlobal("useIssuesMethods", () => ({ update, create, remove }));
    vi.stubGlobal("storeToRefs", (value: unknown) => value);
    vi.stubGlobal("useCategories", () => ({ categories: ref([]) }));
    vi.stubGlobal("useIsEditing", () => ({ isEditing: editing }));
    vi.stubGlobal("useConnectionStatus", () => ({ isConnected: connected }));
    vi.stubGlobal("useMatomoTracking", () => ({ trackEvent }));
    vi.stubGlobal("useAuth", () => ({ data: ref({ name: "Tester" }), token: ref("Bearer token") }));
    vi.stubGlobal("navigateTo", navigate);
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("$fetch", fetch);
});
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()); vi.unstubAllGlobals(); });
function editor(issue: Issue | NewIssue = draft()) {
    const wrapper = mount(EditForm, { props: { modelValue: issue, dialog: true }, global: { stubs: { ...uiStubs, CategorySelect: true, TagSelect: true, QuillEditor: defineComponent({ methods: { getQuill: () => null }, template: "<div />" }) } } });
    wrappers.push(wrapper);
    return wrapper;
}
const button = (wrapper: ReturnType<typeof editor>, text: string) => wrapper.findAll("button").find((b) => b.text() === text)!;
describe("issue editor persistence boundaries", () => {
    it("creates drafts, navigates to the saved identity and reports analytics only after success", async () => {
        const wrapper = editor();
        create.mockResolvedValueOnce({ ...draft(), id: 5 });
        await wrapper.get("input").setValue("Changed");
        expect(button(wrapper, "Opslaan").attributes("disabled")).toBeUndefined();
        await wrapper.get("form").trigger("submit");
        await flushPromises();
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: "Changed" }));
        expect(update).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith("/kaart/5");
        expect(trackEvent).toHaveBeenCalledWith("Issue", "Created", expect.stringContaining("#5"));
    });
    it("updates existing issues, exits editing and blocks submission while disconnected", async () => {
        const wrapper = editor({ ...draft(), id: 3 } as Issue);
        connected.value = false;
        await wrapper.get("form").trigger("submit");
        expect(update).not.toHaveBeenCalled();
        connected.value = true;
        await wrapper.get("form").trigger("submit");
        await flushPromises();
        expect(update).toHaveBeenCalledWith(3, expect.objectContaining({ id: 3 }));
        expect(editing.value).toBe(false);
        expect(wrapper.emitted("update:dialog")?.at(-1)).toEqual([false]);
    });
    it("restores the initial draft on cancel and never sends a mutation", async () => {
        const wrapper = editor();
        await wrapper.get("input").setValue("Unsaved");
        await button(wrapper, "Annuleren").trigger("click");
        expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([draft()]);
        expect(create).not.toHaveBeenCalled();
        expect(editing.value).toBe(false);
    });
    it("keeps a failed save open with its edited content intact", async () => {
        const errors = vi.fn();
        const wrapper = mount(EditForm, { props: { modelValue: { ...draft(), id: 3 } as Issue, dialog: true }, global: { stubs: { ...uiStubs, CategorySelect: true, TagSelect: true, QuillEditor: true }, config: { errorHandler: errors } } });
        wrappers.push(wrapper);
        update.mockRejectedValueOnce(new Error("offline"));
        await wrapper.get("input").setValue("Keep me");
        await wrapper.get("form").trigger("submit");
        await flushPromises();
        expect(errors).toHaveBeenCalled();
        expect(editing.value).toBe(true);
        expect(wrapper.emitted("update:dialog")).toBeUndefined();
        expect(wrapper.get("input").element.value).toBe("Keep me");
    });
    it("requires delete confirmation and navigates away only after deletion", async () => {
        const wrapper = editor({ ...draft(), id: 3 } as Issue);
        vi.mocked(globalThis.confirm).mockReturnValueOnce(false);
        await button(wrapper, "Verwijderen").trigger("click");
        expect(remove).not.toHaveBeenCalled();
        await button(wrapper, "Verwijderen").trigger("click");
        await flushPromises();
        expect(remove).toHaveBeenCalledWith(3);
        expect(navigate).toHaveBeenCalledWith("/kaart");
    });
    it("blocks an invalid form and reports missing geometry", async () => {
        const wrapper = editor({ title: "", description: "", tags: [] });
        expect(wrapper.text()).toContain("Voeg een locatie toe");
        wrapper.getComponent(Form).vm.$emit("update:modelValue", false);
        await flushPromises();
        await wrapper.get("form").trigger("submit");
        expect(create).not.toHaveBeenCalled();
        const geometry = wrapper.findAllComponents(Field)[1]!;
        expect(geometry.props("rules")[0]("")).toContain("Voeg een locatie");
    });
    it("fetches a Street View preview with auth, inserts it in the draft and handles parse failures", async () => {
        const wrapper = editor();
        await button(wrapper, "Street View toevoegen").trigger("click");
        const field = wrapper.findAll("input").at(-1)!;
        await field.setValue("https://maps.app.goo.gl/test");
        fetch.mockRejectedValueOnce({ data: { message: "Invalid link" } });
        await button(wrapper, "Ophalen").trigger("click");
        await flushPromises();
        expect(wrapper.text()).toContain("Invalid link");
        const preview = { lat: 52, lng: 6, heading: 0, pitch: 0, fov: 90, panoId: "pano", previewDataUrl: "data:image/png;base64,YQ==", embedSrc: "https://www.google.com/maps/embed?pb=example" };
        fetch.mockResolvedValueOnce(preview);
        await button(wrapper, "Ophalen").trigger("click");
        await flushPromises();
        expect(fetch).toHaveBeenLastCalledWith("/api/streetview/parse", expect.objectContaining({ headers: { Authorization: "Bearer token" } }));
        await button(wrapper, "Invoegen").trigger("click");
        await flushPromises();
        expect(wrapper.props("modelValue").description).toContain('class="streetview-embed"');
        expect(create).not.toHaveBeenCalled();
    });
});

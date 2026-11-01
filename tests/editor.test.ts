// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Field, Form, uiStubs } from "./helpers/ui";
import type { Issue, NewIssue } from "../shared/types/Issue";
import EditForm from "../app/components/EditForm.client.vue";
import { useIssueSlug } from "../app/composables/useIssueSlug";
vi.mock("@vueup/vue-quill", () => ({ QuillEditor: { name: "QuillEditor", template: "<div />" } }));
vi.mock("quill-image-compress", () => ({ imageCompressor: {} }));
vi.mock("../app/utils/streetViewEmbedBlot", () => ({ ensureStreetViewEmbedBlotRegistered: vi.fn().mockResolvedValue(undefined) }));
const update = vi.fn(), create = vi.fn(), remove = vi.fn(), getUniqueSlug = vi.fn(), navigate = vi.fn(), trackEvent = vi.fn(), fetch = vi.fn();
const editing = ref(true), connected = ref(true);
const wrappers: Array<{
    unmount(): void;
}> = [];
const draft = (): NewIssue => ({ title: "Draft", slug: "draft", description: "text", tags: [], legend_id: 1, geometry: { type: "Point", coordinates: [6, 52] } });
beforeEach(() => {
    vueGlobals();
    vi.clearAllMocks();
    getUniqueSlug.mockImplementation(async (slug: string) => ({ slug }));
    editing.value = true;
    connected.value = true;
    vi.stubGlobal("useIssuesMethods", () => ({ update, create, getUniqueSlug, remove }));
    vi.stubGlobal("useIssueSlug", useIssueSlug);
    vi.stubGlobal("storeToRefs", (value: unknown) => value);
    vi.stubGlobal("useCategories", () => ({ categories: ref([]) }));
    vi.stubGlobal("useIsEditing", () => ({ isEditing: editing }));
    vi.stubGlobal("useConnectionStatus", () => ({ isConnected: connected }));
    vi.stubGlobal("useMatomoTracking", () => ({ trackEvent }));
    vi.stubGlobal("useAuth", () => ({ data: ref({ name: "Tester" }), token: ref("Bearer token") }));
    vi.stubGlobal("useTagsApi", () => ({ refreshTags: vi.fn() }));
    vi.stubGlobal("navigateTo", navigate);
    vi.stubGlobal("useRoute", () => ({ params: { id: "draft" }, query: {} }));
    vi.stubGlobal("useRequestURL", () => new URL("https://issues.example.test/kaart/new"));
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("$fetch", fetch);
});
afterEach(() => { vi.useRealTimers(); wrappers.splice(0).forEach((w) => w.unmount()); vi.unstubAllGlobals(); });
function editor(issue: Issue | NewIssue = draft()) {
    const wrapper = mount(EditForm, { props: { modelValue: issue, dialog: true }, global: { stubs: { ...uiStubs, CategorySelect: true, TagSelect: true, QuillEditor: defineComponent({ methods: { getQuill: () => null }, template: "<div />" }) } } });
    wrappers.push(wrapper);
    return wrapper;
}
const button = (wrapper: ReturnType<typeof editor>, text: string) => wrapper.findAll("button").find((b) => b.text() === text)!;
describe("issue editor persistence boundaries", () => {
    it("creates drafts, navigates to the saved identity and reports analytics only after success", async () => {
        vi.useFakeTimers();
        const wrapper = editor();
        await vi.advanceTimersByTimeAsync(300);
        await flushPromises();
        create.mockResolvedValueOnce({ ...draft(), id: 5, slug: "draft" });
        await wrapper.get("input").setValue("Changed");
        expect(button(wrapper, "Opslaan").attributes("disabled")).toBeUndefined();
        await wrapper.get("form").trigger("submit");
        await flushPromises();
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: "Changed", slug: "draft" }));
        expect(update).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith("/kaart/draft");
        expect(trackEvent).toHaveBeenCalledWith("Issue", "Created", expect.stringContaining("#5"));
        vi.useRealTimers();
    });
    it("checks uniqueness on blur and replaces an existing numeric suffix", async () => {
        const wrapper = editor();
        getUniqueSlug.mockImplementation(async (slug: string) => ({
            slug: slug === "occupied-2" ? "occupied-3" : slug,
        }));

        const slugInput = wrapper.find('input[aria-label="URL-deel"]');
        await slugInput.setValue("occupied-2");
        expect(getUniqueSlug).not.toHaveBeenCalled();
        await slugInput.trigger("blur");
        await flushPromises();

        expect(slugInput.element.value).toBe("occupied-3");
        expect(getUniqueSlug).toHaveBeenCalledWith("occupied-2", undefined);
    });
    it("waits for the title to settle before generating a new slug and shows the pending state", async () => {
        vi.useFakeTimers();
        const wrapper = editor({ title: "", description: "text", tags: [] });
        const titleInput = wrapper.findAll("input")[0]!;
        const slugInput = wrapper.find('input[aria-label="URL-deel"]');

        await titleInput.setValue("De Brink op slot");
        expect(slugInput.element.value).toBe("");
        expect(wrapper.text()).toContain("Wachten tot de titel compleet is");
        expect(wrapper.find(".issue-url-prefix").text())
            .toBe("https://issues.example.test/kaart/");
        expect(getUniqueSlug).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1999);
        expect(slugInput.element.value).toBe("");
        await vi.advanceTimersByTimeAsync(1);
        await flushPromises();

        expect(slugInput.element.value).toBe("de-brink-op-slot");
        expect(
            `${wrapper.find(".issue-url-prefix").text()}${slugInput.element.value}`,
        ).toBe("https://issues.example.test/kaart/de-brink-op-slot");
        expect(getUniqueSlug).toHaveBeenCalledWith("de-brink-op-slot", undefined);
        vi.useRealTimers();
    });
    it("generates a new title slug immediately when the title field loses focus", async () => {
        const wrapper = editor({ title: "", description: "text", tags: [] });
        await wrapper.findAll("input")[0]!.setValue("De Brink op slot");
        wrapper.findAllComponents(Field)[0]!.vm.$emit("blur");
        await flushPromises();

        expect(wrapper.findAll("input")[1]!.element.value).toBe("de-brink-op-slot");
        expect(getUniqueSlug).toHaveBeenCalledWith("de-brink-op-slot", undefined);
    });
    it("updates existing issues, exits editing and blocks submission while disconnected", async () => {
        const wrapper = editor({ ...draft(), id: 3 } as Issue);
        connected.value = false;
        await wrapper.get("form").trigger("submit");
        expect(update).not.toHaveBeenCalled();
        connected.value = true;
        update.mockResolvedValueOnce({ slug: "draft" });
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
        vi.useFakeTimers();
        const errors = vi.fn();
        const wrapper = mount(EditForm, { props: { modelValue: { ...draft(), id: 3 } as Issue, dialog: true }, global: { stubs: { ...uiStubs, CategorySelect: true, TagSelect: true, QuillEditor: true }, config: { errorHandler: errors } } });
        wrappers.push(wrapper);
        await vi.advanceTimersByTimeAsync(300);
        await flushPromises();
        vi.useRealTimers();
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

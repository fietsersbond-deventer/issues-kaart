// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import LoginForm from "../app/components/LoginForm.vue";
import PasswordInput from "../app/components/PasswordInput.vue";
import NewPassword from "../app/components/NewPassword.vue";
import UserForm from "../app/components/UserForm.vue";
import { Field, Form, uiStubs } from "./helpers/ui";
import { vueGlobals } from "./helpers/vue";
const signIn = vi.fn(), fetch = vi.fn();
const wrappers: Array<{
    unmount(): void;
}> = [];
beforeEach(() => { vueGlobals(); vi.stubGlobal("useAuth", () => ({ signIn, data: ref({ role: "admin" }) })); vi.stubGlobal("$fetch", fetch); vi.stubGlobal("navigateTo", vi.fn()); vi.spyOn(console, "error").mockImplementation(() => { }); signIn.mockReset(); fetch.mockReset(); });
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("authentication and user forms", () => {
    it("passes credentials to sign-in and shows an actionable error while releasing loading state", async () => {
        const wrapper = mount(LoginForm, { global: { mocks: { navigateTo: (...args: unknown[]) => vi.mocked(globalThis.navigateTo)(...args as [
                        string
                    ]) }, stubs: { ...uiStubs, PasswordInput: Field } } });
        wrappers.push(wrapper);
        await wrapper.findAll("input")[0]!.setValue("user@example.test");
        await wrapper.findAll("input")[1]!.setValue("pw");
        signIn.mockRejectedValueOnce(new Error("denied"));
        await wrapper.get("form").trigger("submit");
        await flushPromises();
        expect(signIn).toHaveBeenCalledWith({ username: "user@example.test", password: "pw" }, { callbackUrl: "/" });
        expect(wrapper.text()).toContain("Ongeldige gebruikersnaam of wachtwoord.");
        expect(wrapper.getComponent(Field).props("disabled")).toBe(false);
        signIn.mockResolvedValueOnce(undefined);
        await wrapper.get("form").trigger("submit");
        await flushPromises();
        expect(wrapper.text()).not.toContain("Ongeldige gebruikersnaam");
        await wrapper.findAll("button").at(-1)!.trigger("click");
        expect(globalThis.navigateTo).toHaveBeenCalledWith("/reset-password");
    });
    it("toggles password visibility while preserving the model", async () => {
        const wrapper = mount(PasswordInput, { props: { modelValue: "secret" }, global: { stubs: uiStubs } });
        wrappers.push(wrapper);
        const field = wrapper.getComponent(Field);
        expect(field.props("type")).toBe("password");
        field.vm.$emit("click:append-inner");
        await flushPromises();
        expect(field.props("type")).toBe("text");
        await wrapper.get("input").setValue("updated");
        expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["updated"]);
    });
    it("checks strength, emits safe defaults for empty/failed checks and displays server feedback", async () => {
        const wrapper = mount(NewPassword, { props: { modelValue: "" }, global: { stubs: { ...uiStubs, VProgressLinear: true } } });
        wrappers.push(wrapper);
        const field = wrapper.getComponent(Field);
        expect(field.props("rules")[0]("")).toBe("Wachtwoord is verplicht");
        fetch.mockResolvedValueOnce({ score: 1, isStrong: false, feedback: { warning: "Too simple", suggestions: ["Use more words"] } });
        await wrapper.get("input").setValue("weak");
        await flushPromises();
        expect(wrapper.text()).toContain("Too simple");
        expect(wrapper.text()).toContain("Use more words");
        expect(wrapper.emitted("strength-change")?.at(-1)).toEqual([{ score: 1, isStrong: false }]);
        field.vm.$emit("click:append-inner");
        await flushPromises();
        expect(field.props("type")).toBe("text");
        fetch.mockRejectedValueOnce(new Error("offline"));
        await wrapper.get("input").setValue("longer");
        await flushPromises();
        expect(wrapper.text()).toContain("Kan wachtwoordsterkte niet controleren");
        await wrapper.get("input").setValue("");
        await flushPromises();
        expect(wrapper.emitted("strength-change")?.at(-1)).toEqual([{ score: 0, isStrong: false }]);
    });
    it("creates users with a password, omits it for edits and blocks invalid form submissions", async () => {
        const wrapper = mount(UserForm, { global: { stubs: { ...uiStubs, VSelect: Field, NewPassword: Field } } });
        wrappers.push(wrapper);
        const inputs = wrapper.findAll("input");
        await inputs[0]!.setValue("new");
        await inputs[3]!.setValue("secret");
        await wrapper.get("form").trigger("submit");
        expect(wrapper.emitted("submit")?.at(-1)).toEqual([{ username: "new", name: null, role: "user", password: "secret" }]);
        wrapper.getComponent(Form).vm.$emit("update:modelValue", false);
        await flushPromises();
        await wrapper.get("form").trigger("submit");
        expect(wrapper.emitted("submit")).toHaveLength(1);
        await wrapper.findAll("button").at(-1)!.trigger("click");
        expect(wrapper.emitted("cancel")).toHaveLength(1);
        const edit = mount(UserForm, { props: { user: { id: 1, username: "existing", name: "Name", role: "admin" } }, global: { stubs: { ...uiStubs, VSelect: Field, NewPassword: Field } } });
        wrappers.push(edit);
        await edit.get("form").trigger("submit");
        expect(edit.emitted("submit")?.[0]).toEqual([{ username: "existing", name: "Name", role: "admin" }]);
    });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, ref, effectScope } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Slot, uiStubs } from "./helpers/ui";
import NavBar from "../app/components/NavBar.vue";
import Desktop from "../app/components/layout/Desktop.vue";
import Mobile from "../app/components/layout/Mobile.vue";
import MapPage from "../app/pages/kaart.vue";
import IssuePage from "../app/pages/kaart/[id].vue";
import Admin from "../app/pages/admin.vue";
import Login from "../app/pages/login.vue";
import Welcome from "../app/pages/kaart/index.vue";
import Index from "../app/pages/index.vue";
import type { Issue } from "../shared/types/Issue";
import { isExistingIssue } from "../shared/types/Issue";
vi.mock("vue3-openlayers", () => ({ default: { install: vi.fn() } }));
const MapSlot = defineComponent({ template: '<div><slot name="bottom-left-controls" :map-width="800" /><slot name="top-left-controls" /></div>' });
const Drawer = defineComponent({ props: ["width"], template: '<aside :data-width="width"><slot /></aside>' });
const stubs = { ...uiStubs, VLayout: Slot, VMain: Slot, VApp: Slot, VAppBar: Slot, VList: Slot, VListItem: defineComponent({ props: ["title", "to"], template: '<a :href="to">{{ title }}</a>' }), VNavigationDrawer: Drawer, VToolbar: Slot, VTooltip: Slot, VIcon: true, Toolbar: Slot, OnlineUsers: true, LoginForm: true, NuxtPage: Slot, NuxtLayout: Slot, NuxtLoadingIndicator: true, NuxtErrorBoundary: Slot, NavBar: true, VSnackbar: Slot, VExpansionPanels: Slot, VExpansionPanel: Slot, VExpansionPanelText: Slot, Map: MapSlot, MapLegend: true, MapLayerSwitcher: true, MapSidePanel: true, ClientOnly: Slot, LayoutMobile: true, LayoutDesktop: true, Intro: true, EditForm: true, IssueDetails: true };
const status = ref("authenticated"), mobile = ref(false), editing = ref(false), connected = ref(true), menu = ref(false);
const signOut = vi.fn();
const wrappers: Array<{
    unmount(): void;
}> = [];
beforeEach(() => {
    vueGlobals();
    signOut.mockReset();
    menu.value = false;
    status.value = "authenticated";
    mobile.value = false;
    editing.value = false;
    connected.value = true;
    vi.stubGlobal("useAuth", () => ({ status, signOut }));
    vi.stubGlobal("useTexts", () => ({ getText: (key: string) => ({ text: key === "navbar.header" ? "Organization" : "https://example.test" }) }));
    vi.stubGlobal("useVDisplay", () => ({ mobile }));
    vi.stubGlobal("useTitle", vi.fn());
    vi.stubGlobal("definePageMeta", vi.fn());
    vi.stubGlobal("navigateTo", vi.fn());
    vi.stubGlobal("useMapEventBus", () => ({ provide: vi.fn() }));
    vi.stubGlobal("useMapLayerPreference", () => ({ preferredLayer: ref("Licht") }));
    vi.stubGlobal("useMapMenu", () => ({ open: menu }));
    vi.stubGlobal("useIsEditing", () => ({ isEditing: editing, setEditing: (value: boolean) => { editing.value = value; }, toggleEditing: () => { editing.value = !editing.value; } }));
    vi.stubGlobal("useConnectionStatus", () => ({ isConnected: connected }));
    vi.stubGlobal("useIssueLocks", () => ({ isLockedByOther: ref(false) }));
    vi.stubGlobal("storeToRefs", (x: unknown) => x);
    vi.stubGlobal("useSelectedIssue", () => ({ issue: ref({ id: 1, title: "Issue", tags: [], geometry: { type: "Point", coordinates: [6, 52] } } as unknown as Issue) }));
    vi.stubGlobal("useRoute", () => ({ params: { id: "1" } }));
    vi.stubGlobal("useIssueNotifications", vi.fn());
    vi.stubGlobal("isExistingIssue", isExistingIssue);
    vi.stubGlobal("useRoles", () => ({ isAdmin: ref(true) }));
});
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function keep<T extends {
    unmount(): void;
}>(wrapper: T): T { wrappers.push(wrapper); return wrapper; }
it("shows authenticated actions and logs out, then displays configured public links", async () => {
    const wrapper = keep(mount(NavBar, { global: { stubs, directives: { tooltip: () => { } } } }));
    expect(wrapper.text()).toContain("Organization");
    await wrapper.get('button[aria-label="Uitloggen"]').trigger("click");
    await flushPromises();
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    status.value = "unauthenticated";
    await flushPromises();
    expect(wrapper.get('button[aria-label="Afdeling"]').attributes("href")).toBe("https://example.test");
    expect(wrapper.find('button[aria-label="Beheer"]').exists()).toBe(false);
});
it("renders the shared snackbar as a persistent alert or transient snackbar", async () => {
    const App = (await import("../app/app.vue")).default;
    const { useSnackbar } = await import("../app/composables/useSnackbar");
    const snackbar = useSnackbar();
    snackbar.showPersistent("Offline", "warning");
    const wrapper = keep(mount(App, { global: { stubs } }));
    expect(wrapper.text()).toContain("Offline");
    snackbar.showMessage("Saved");
    await flushPromises();
    expect(wrapper.text()).toContain("Saved");
    expect(globalThis.useIssueNotifications).toHaveBeenCalledTimes(1);
});
it("resizes the desktop drawer and removes resize listeners on unmount", async () => {
    const unlisten = vi.spyOn(window, "removeEventListener");
    const wrapper = keep(mount(Desktop, { global: { stubs } }));
    await flushPromises();
    expect(wrapper.getComponent(Drawer).props("width")).toBe(Math.min(window.innerWidth / 2, 600));
    vi.stubGlobal("innerWidth", 800);
    window.dispatchEvent(new Event("resize"));
    await flushPromises();
    expect(wrapper.getComponent(Drawer).props("width")).toBe(400);
    wrapper.unmount();
    expect(unlisten).toHaveBeenCalledWith("resize", expect.any(Function));
});
it("toggles the mobile sheet accessibly and opens the map menu", async () => {
    const sheetHeight = ref(50), setHeight = vi.fn((height: number) => { sheetHeight.value = height; });
    vi.stubGlobal("useBottomSheet", () => ({ sheetHeight, setHeight, sheetContentRef: ref(null), startDrag: vi.fn(), onDrag: vi.fn(), endDrag: vi.fn(), startDragMouse: vi.fn() }));
    const wrapper = keep(mount(Mobile, { global: { stubs } }));
    await wrapper.get(".drag-handle").trigger("keydown", { key: "Enter" });
    expect(setHeight).toHaveBeenLastCalledWith(75);
    await wrapper.get(".drag-handle").trigger("keydown", { key: " " });
    expect(setHeight).toHaveBeenLastCalledWith(40);
    await wrapper.get('button[aria-label="Kaartlagen en legenda openen"]').trigger("click");
    expect(menu.value).toBe(true);
});
it("chooses the correct map layout", async () => {
    const wrapper = keep(mount(MapPage, { global: { stubs } }));
    expect(wrapper.find("layout-desktop-stub").exists()).toBe(true);
    mobile.value = true;
    await flushPromises();
    expect(wrapper.find("layout-mobile-stub").exists()).toBe(true);
});
it("enters/exits issue editing and clears editing state when navigating away", async () => {
    const wrapper = keep(mount(IssuePage, { global: { stubs, mocks: { isExistingIssue, $vuetify: { display: { mobile: false } } } } }));
    expect(wrapper.find("issue-details-stub").exists()).toBe(true);
    await wrapper.get('button[aria-label="Bewerken"]').trigger("click");
    expect(editing.value).toBe(true);
    await wrapper.get('button[aria-label="Bewerken annuleren"]').trigger("click");
    expect(editing.value).toBe(false);
    connected.value = false;
    await flushPromises();
    expect(wrapper.find('button[aria-label="Bewerken"]').exists()).toBe(false);
    connected.value = true;
    await flushPromises();
    await wrapper.get('button[aria-label="Bewerken"]').trigger("click");
    expect(editing.value).toBe(true);
    wrapper.unmount();
    expect(editing.value).toBe(false);
});
it("renders admin navigation, login and welcome entry points, and declares root redirect middleware", () => {
    const admin = keep(mount(Admin, { global: { stubs } }));
    expect(admin.text()).toContain("Gebruikers");
    expect(admin.get('a[href="/admin/tags"]').text()).toBe("Tags");
    const login = keep(mount(Login, { global: { stubs } }));
    expect(login.text()).toContain("Inloggen");
    const welcome = keep(mount(Welcome, { global: { stubs } }));
    expect(welcome.find("intro-stub").exists()).toBe(true);
    keep(mount(Index, { global: { stubs } }));
    const meta = vi.mocked(globalThis.definePageMeta).mock.calls.at(-1)![0] as {
        middleware(): void;
        render(): null;
    };
    meta.middleware();
    expect(globalThis.navigateTo).toHaveBeenCalledWith("/kaart");
    expect(meta.render()).toBeNull();
});
it("limits ordinary users' admin navigation to categories, tags and texts", () => {
    vi.stubGlobal("useRoles", () => ({ isAdmin: ref(false) }));
    const admin = keep(mount(Admin, { global: { stubs } }));
    expect(admin.get('a[href="/admin/legends"]').text()).toBe("Categorieën");
    expect(admin.get('a[href="/admin/tags"]').text()).toBe("Tags");
    expect(admin.get('a[href="/admin/texts"]').text()).toBe("Teksten");
    expect(admin.find('a[href="/admin/users"]').exists()).toBe(false);
    expect(admin.text()).not.toContain("Gebruikers");
});
it("initializes analytics, records page views/events and installs OpenLayers", async () => {
    vi.useFakeTimers();
    const scope = effectScope();
    try {
        const title = ref("Map");
        vi.stubGlobal("useTitle", () => ({ currentTitle: title }));
        vi.stubGlobal("useRoute", () => ({ fullPath: "/kaart" }));
        vi.stubGlobal("useRuntimeConfig", () => ({ public: { matomo: { siteId: "1" } } }));
        const plugin = (await import("../app/plugins/matomo.client")).default;
        scope.run(() => plugin());
        await vi.advanceTimersByTimeAsync(501);
        expect(window._paq).toContainEqual(["setSiteId", "1"]);
        expect(window._paq).toContainEqual(["trackPageView"]);
        const { useMatomoTracking } = await import("../app/composables/useMatomoTracking");
        useMatomoTracking().trackEvent("Issue", "Created", "Test", 1);
        expect(window._paq.at(-1)).toEqual(["trackEvent", "Issue", "Created", "Test", 1]);
        vi.stubGlobal("defineNuxtPlugin", <T,>(fn: T) => fn);
        const openlayers = (await import("../app/plugins/openlayers.client")).default;
        const use = vi.fn();
        openlayers({ vueApp: { use } } as never);
        expect(use).toHaveBeenCalledWith(expect.anything(), { debug: false });
    }
    finally {
        scope.stop();
        vi.useRealTimers();
        document.head.querySelectorAll('script[src="/api/profile/script"]').forEach((node) => node.remove());
    }
});

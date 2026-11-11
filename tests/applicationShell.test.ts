// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, ref, effectScope, h, Suspense } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Slot, uiStubs } from "./helpers/ui";
import NavBar from "../app/components/NavBar.vue";
import Desktop from "../app/components/layout/Desktop.vue";
import Mobile from "../app/components/layout/Mobile.vue";
import MapPage from "../app/pages/kaart.vue";
import IssuePage from "../app/pages/kaart/[id].vue";
import { useIssueEditAvailability } from "../app/composables/useIssueEditAvailability";
import Admin from "../app/pages/admin.vue";
import Login from "../app/pages/login.vue";
import Welcome from "../app/pages/kaart/index.vue";
import Index from "../app/pages/index.vue";
import type { Issue } from "../shared/types/Issue";
import { isExistingIssue } from "../shared/types/Issue";
import type { ModuleRuntimeHooks } from "vuetify-nuxt-module";
vi.mock("vue3-openlayers", () => ({ default: { install: vi.fn() } }));
const MapSlot = defineComponent({
  template:
    '<div><slot name="bottom-left-controls" :map-width="800" /><slot name="top-left-controls" /></div>',
});
const Drawer = defineComponent({
  props: ["width"],
  template: '<aside :data-width="width"><slot /></aside>',
});
const stubs = {
  ...uiStubs,
  VLayout: Slot,
  VMain: Slot,
  VApp: Slot,
  VAppBar: Slot,
  VList: Slot,
  VListItem: defineComponent({
    props: ["title", "to"],
    template: '<a :href="to">{{ title }}</a>',
  }),
  VNavigationDrawer: Drawer,
  VToolbar: Slot,
  VTooltip: Slot,
  VIcon: true,
  Toolbar: Slot,
  OnlineUsers: true,
  LoginForm: true,
  NuxtPage: Slot,
  NuxtLayout: Slot,
  NuxtLoadingIndicator: true,
  NuxtErrorBoundary: Slot,
  NavBar: true,
  VSnackbar: Slot,
  VExpansionPanels: Slot,
  VExpansionPanel: Slot,
  VExpansionPanelText: Slot,
  Map: MapSlot,
  MapLegend: true,
  MapLayerSwitcher: true,
  MapSidePanel: true,
  ClientOnly: Slot,
  LayoutMobile: true,
  LayoutDesktop: true,
  Intro: true,
  EditForm: true,
  IssueDetails: true,
};
const status = ref("authenticated"),
  mobile = ref(false),
  editing = ref(false),
  connected = ref(true),
  lockedBy = ref<string | false>(false),
  menu = ref(false);
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
  lockedBy.value = false;
  vi.stubGlobal("useAuth", () => ({ status, signOut }));
  vi.stubGlobal("useTexts", () => ({
    getText: (key: string) => ({
      text: key === "navbar.header" ? "Organization" : "https://example.test",
    }),
  }));
  vi.stubGlobal("useVDisplay", () => ({ mobile }));
  vi.stubGlobal("onServerPrefetch", vi.fn());
  vi.stubGlobal("useTitle", vi.fn());
  vi.stubGlobal("useIssueOpenGraph", vi.fn());
  vi.stubGlobal("definePageMeta", vi.fn());
  vi.stubGlobal("navigateTo", vi.fn());
  vi.stubGlobal("useMapEventBus", () => ({ provide: vi.fn() }));
  vi.stubGlobal("useMapLayerPreference", () => ({
    preferredLayer: ref("Licht"),
  }));
  vi.stubGlobal("useMapMenu", () => ({ open: menu }));
  vi.stubGlobal("useIsEditing", () => ({
    isEditing: editing,
    setEditing: (value: boolean) => {
      editing.value = value;
    },
    toggleEditing: () => {
      editing.value = !editing.value;
    },
  }));
  vi.stubGlobal("useConnectionStatus", () => ({ isConnected: connected }));
  vi.stubGlobal("useIssueEditAvailability", useIssueEditAvailability);
  vi.stubGlobal("useIssueLocks", () => ({
    getEditAvailability: () => ({
      isConnected: connected.value,
      isLockedByOther: lockedBy.value,
      canEdit: connected.value && !lockedBy.value,
    }),
  }));
  vi.stubGlobal("storeToRefs", (x: unknown) => x);
  vi.stubGlobal("useSelectedIssue", () => ({
    issue: ref({
      id: 1,
      title: "Issue",
      tags: [],
      geometry: { type: "Point", coordinates: [6, 52] },
    } as unknown as Issue),
  }));
  vi.stubGlobal("useRoute", () => ({ params: { id: "1" } }));
  vi.stubGlobal("useIssueNotifications", vi.fn());
  vi.stubGlobal(
    "useIssues",
    vi.fn(() => ({ load: vi.fn() })),
  );
  vi.stubGlobal("callOnce", (_key: string, callback: () => unknown) =>
    callback(),
  );
  vi.stubGlobal("isExistingIssue", isExistingIssue);
  vi.stubGlobal("useRoles", () => ({ isAdmin: ref(true) }));
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function keep<
  T extends {
    unmount(): void;
  },
>(wrapper: T): T {
  wrappers.push(wrapper);
  return wrapper;
}
it("shows authenticated actions and logs out, then displays configured public links", async () => {
  const wrapper = keep(
    mount(NavBar, { global: { stubs, directives: { tooltip: () => {} } } }),
  );
  expect(wrapper.text()).toContain("Organization");
  await wrapper.get('button[aria-label="Uitloggen"]').trigger("click");
  await flushPromises();
  expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  status.value = "unauthenticated";
  await flushPromises();
  expect(wrapper.get('button[aria-label="Afdeling"]').attributes("href")).toBe(
    "https://example.test",
  );
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
  expect(wrapper.getComponent(Drawer).props("width")).toBe(
    Math.min(window.innerWidth / 2, 600),
  );
  vi.stubGlobal("innerWidth", 800);
  window.dispatchEvent(new Event("resize"));
  await flushPromises();
  expect(wrapper.getComponent(Drawer).props("width")).toBe(400);
  wrapper.unmount();
  expect(unlisten).toHaveBeenCalledWith("resize", expect.any(Function));
});
it("toggles the mobile sheet accessibly and opens the map menu", async () => {
  const sheetHeight = ref(50),
    setHeight = vi.fn((height: number) => {
      sheetHeight.value = height;
    });
  vi.stubGlobal("useBottomSheet", () => ({
    sheetHeight,
    setHeight,
    sheetContentRef: ref(null),
    startDrag: vi.fn(),
    onDrag: vi.fn(),
    endDrag: vi.fn(),
    startDragMouse: vi.fn(),
  }));
  const wrapper = keep(mount(Mobile, { global: { stubs } }));
  expect(wrapper.get(".bottom-sheet").attributes("style")).toContain(
    "height: calc(50% + 8px)",
  );
  await wrapper.get(".drag-handle").trigger("keydown", { key: "Enter" });
  expect(setHeight).toHaveBeenLastCalledWith(75);
  await wrapper.get(".drag-handle").trigger("keydown", { key: " " });
  expect(setHeight).toHaveBeenLastCalledWith(40);
  await wrapper
    .get('button[aria-label="Kaartlagen en legenda openen"]')
    .trigger("click");
  expect(menu.value).toBe(true);
});
it("chooses the correct map layout", async () => {
  const Page = defineComponent({
    setup: () => () => h(Suspense, null, { default: () => h(MapPage) }),
  });
  const wrapper = keep(mount(Page, { global: { stubs } }));
  await flushPromises();
  expect(globalThis.useIssues).toHaveBeenCalledTimes(1);
  expect(wrapper.find("layout-desktop-stub").exists()).toBe(true);
  mobile.value = true;
  await flushPromises();
  expect(wrapper.find("layout-mobile-stub").exists()).toBe(true);
});
it("uses viewport hints, then a width cookie, then browser headers for the initial SSR breakpoint", async () => {
  vi.stubGlobal("defineNuxtPlugin", <T>(plugin: T) => plugin);
  const width = ref<unknown>(null);
  let headers: Record<string, string> = {};
  vi.stubGlobal("useCookie", () => width);
  vi.stubGlobal("useRequestHeaders", () => headers);
  const plugin = (await import("../app/plugins/viewport")).default;
  type ViewportHook = ModuleRuntimeHooks["vuetify:ssr-client-hints"];
  for (const scenario of [
    {
      agent:
        "Mozilla/5.0 (X11; Linux x86_64; rv:159.0) Gecko/20100101 Firefox/159.0",
      cookie: null,
      hint: undefined,
      expected: 1280,
    },
    {
      agent:
        "Mozilla/5.0 (Android 17; Mobile; rv:159.0) Gecko/159.0 Firefox/159.0",
      cookie: null,
      hint: undefined,
      expected: 390,
    },
    {
      agent:
        "Mozilla/5.0 (Android 17; Tablet; rv:159.0) Gecko/159.0 Firefox/159.0",
      cookie: null,
      hint: undefined,
      expected: 1280,
    },
    { agent: "Desktop", cookie: 480, hint: undefined, expected: 480 },
    { agent: "Mobile", cookie: 1440, hint: undefined, expected: 1440 },
    { agent: "Mobile", cookie: 480, hint: 1200, expected: 1200 },
    ...[0, -1, "480", {}, null].map((cookie) => ({
      agent: "Desktop",
      cookie,
      hint: undefined,
      expected: 1280,
    })),
  ]) {
    headers = { "user-agent": scenario.agent };
    width.value = scenario.cookie;
    let applyViewport: ViewportHook | undefined;
    const hook = vi.fn((name: string, callback: ViewportHook) => {
      if (name === "vuetify:ssr-client-hints") applyViewport = callback;
    });
    const scope = effectScope();
    try {
      scope.run(() => plugin({ hook } as never));
      const options: Parameters<ViewportHook>[0] = {
        vuetifyOptions: { ssr: true },
        ssrClientHints: {
          viewportWidth: scenario.hint,
          firstRequest: true,
          prefersColorSchemeAvailable: false,
          prefersReducedMotionAvailable: false,
          viewportHeightAvailable: false,
          viewportWidthAvailable: false,
          devicePixelRatioAvailable: false,
        },
        ssrClientHintsConfiguration: { viewportSize: true },
      };
      applyViewport!(options);
      expect(options.ssrClientHints.viewportWidth).toBe(scenario.expected);
      expect(options.vuetifyOptions.ssr).toMatchObject({
        clientWidth: scenario.expected,
      });
    } finally {
      scope.stop();
    }
  }
});
it("remembers the real viewport after mounting and resizing, and cleans up its listener", async () => {
  vi.stubGlobal("defineNuxtPlugin", <T>(plugin: T) => plugin);
  const width = ref<number | null>(null);
  vi.stubGlobal("useCookie", () => width);
  vi.stubGlobal("useRequestHeaders", () => ({}));
  const plugin = (await import("../app/plugins/viewport")).default;
  let mounted: (() => void) | undefined;
  const hook = vi.fn((name: string, callback: () => void) => {
    if (name === "app:mounted") mounted = callback;
  });
  const scope = effectScope();
  vi.stubGlobal("innerWidth", 1440);
  scope.run(() => plugin({ hook } as never));
  expect(width.value).toBeNull();
  mounted!();
  expect(width.value).toBe(1440);
  await flushPromises();
  vi.stubGlobal("innerWidth", 480);
  window.dispatchEvent(new Event("resize"));
  expect(width.value).toBe(480);
  scope.stop();
  vi.stubGlobal("innerWidth", 900);
  window.dispatchEvent(new Event("resize"));
  expect(width.value).toBe(480);
});
it("enters/exits issue editing and clears editing state when navigating away", async () => {
  const wrapper = keep(
    mount(IssuePage, {
      global: {
        stubs,
        mocks: { isExistingIssue, $vuetify: { display: { mobile: false } } },
      },
    }),
  );
  expect(wrapper.find("issue-details-stub").exists()).toBe(true);
  await wrapper.get('button[aria-label="Bewerken"]').trigger("click");
  expect(editing.value).toBe(true);
  connected.value = false;
  await flushPromises();
  await wrapper.get('button[aria-label="Bewerken annuleren"]').trigger("click");
  expect(editing.value).toBe(false);
  connected.value = true;
  lockedBy.value = "Andere gebruiker";
  await flushPromises();
  expect(wrapper.find('button[aria-label="Bewerken"]').exists()).toBe(false);
  expect(
    wrapper.find('button[aria-label="Bewerkt door Andere gebruiker"]').exists(),
  ).toBe(true);
  connected.value = false;
  await flushPromises();
  expect(wrapper.find('button[aria-label="Bewerken"]').exists()).toBe(false);
  expect(
    wrapper.find('button[aria-label="Bewerkt door Andere gebruiker"]').exists(),
  ).toBe(false);
  expect(wrapper.text()).toContain(
    "Verbinding verbroken - bewerken is niet mogelijk",
  );
  connected.value = true;
  await flushPromises();
  expect(
    wrapper.find('button[aria-label="Bewerkt door Andere gebruiker"]').exists(),
  ).toBe(true);
  lockedBy.value = false;
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
    vi.stubGlobal("useRuntimeConfig", () => ({
      public: { matomo: { siteId: "1" } },
    }));
    const plugin = (await import("../app/plugins/matomo.client")).default;
    scope.run(() => plugin());
    await vi.advanceTimersByTimeAsync(501);
    expect(window._paq).toContainEqual(["setSiteId", "1"]);
    expect(window._paq).toContainEqual(["trackPageView"]);
    const { useMatomoTracking } =
      await import("../app/composables/useMatomoTracking");
    useMatomoTracking().trackEvent("Issue", "Created", "Test", 1);
    expect(window._paq.at(-1)).toEqual([
      "trackEvent",
      "Issue",
      "Created",
      "Test",
      1,
    ]);
    vi.stubGlobal("defineNuxtPlugin", <T>(fn: T) => fn);
    const openlayers = (await import("../app/plugins/openlayers.client"))
      .default;
    const use = vi.fn();
    openlayers({ vueApp: { use } } as never);
    expect(use).toHaveBeenCalledWith(expect.anything(), { debug: false });
  } finally {
    scope.stop();
    vi.useRealTimers();
    document.head
      .querySelectorAll('script[src="/api/profile/script"]')
      .forEach((node) => node.remove());
  }
});

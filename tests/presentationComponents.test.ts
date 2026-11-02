// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { computed, defineComponent, ref } from "vue";
import { vueGlobals } from "./helpers/vue";
import { Field, Slot, uiStubs } from "./helpers/ui";
import AppIcon from "../app/components/AppIcon.vue";
import CategoryChip from "../app/components/CategoryChip.vue";
import Tag from "../app/components/Tag.vue";
import LegendIndicator from "../app/components/LegendIndicator.vue";
import UserAvatar from "../app/components/UserAvatar.vue";
import OnlineUsers from "../app/components/OnlineUsers.vue";
import MobileCollapsible from "../app/components/MobileCollapsible.vue";
import Intro from "../app/components/Intro.vue";
import IssueDetails from "../app/components/IssueDetails.vue";
import ShareButton from "../app/components/ShareButton.vue";
import ImageViewer from "../app/components/ImageViewer.vue";
import TextEditor from "../app/components/TextEditorDialog.client.vue";
import { getContrastColor } from "../app/utils/getContrastColor";
import { useStreetViewEmbeds } from "../app/composables/useStreetViewEmbeds";
import type { Issue } from "../shared/types/Issue";

vi.mock("@vueup/vue-quill", () => ({ QuillEditor: { template: "<div />" } }));
const Tooltip = defineComponent({
  props: ["text"],
  template:
    '<span :data-tooltip="text"><slot name="activator" :props="{}" /><slot /></span>',
});
const Icon = defineComponent({
  props: ["name", "icon", "color", "size"],
  template: '<i :data-icon="name || icon"><slot /></i>',
});
const stubs = {
  ...uiStubs,
  VChip: Slot,
  VTooltip: Tooltip,
  VIcon: Icon,
  Icon,
  AppIcon,
  VAvatar: Slot,
};
const showError = vi.fn(),
  showSuccess = vi.fn(),
  showPersistent = vi.fn();
const browserNavigator = window.navigator;
const mobile = ref(false),
  auth = ref("authenticated");
const wrappers: Array<{
  unmount(): void;
}> = [];
const legend = {
  id: 1,
  name: "Routes",
  description: "Safe routes",
  color: "#123456",
  created_at: "2026-01-01",
};

beforeEach(() => {
  showError.mockClear();
  showSuccess.mockClear();
  showPersistent.mockClear();
  vueGlobals();
  auth.value = "authenticated";
  mobile.value = false;
  vi.stubGlobal("useVDisplay", () => ({ mobile }));
  vi.stubGlobal("getContrastColor", getContrastColor);
  vi.stubGlobal("useAuth", () => ({ status: auth }));
  vi.stubGlobal("storeToRefs", (value: unknown) => value);
  vi.stubGlobal("useSnackbar", () => ({
    showError,
    showSuccess,
    showPersistent,
  }));
});
afterEach(() => {
  Reflect.deleteProperty(browserNavigator, "share");
  Reflect.deleteProperty(browserNavigator, "canShare");
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
it("renders legacy and Iconify icons and category/tag labels with their fallback icons", async () => {
  const icon = keep(
    mount(AppIcon, { props: { icon: "mdi-bike" }, global: { stubs } }),
  );
  expect(icon.get("i").attributes("data-icon")).toBe("mdi-bike");
  await icon.setProps({ icon: "tabler:bike", color: "red" });
  expect(icon.get("i").attributes("data-icon")).toBe("tabler:bike");
  const chip = keep(
    mount(CategoryChip, {
      props: { legend },
      global: { stubs, mocks: { getContrastColor } },
    }),
  );
  expect(chip.text()).toContain("Routes");
  expect(chip.text()).toContain("Safe routes");
  const tag = keep(
    mount(Tag, {
      props: {
        tag: { tag: "bike", label: null, description: "Cycling", icon: null },
      },
      global: { stubs },
    }),
  );
  expect(tag.text()).toContain("bike");
  expect(tag.findComponent(AppIcon).props("icon")).toBe("mdi-tag-outline");
  await tag.setProps({
    tag: { tag: "bike", label: "Bicycle", description: null, icon: "mdi-bike" },
    active: true,
  });
  expect(tag.text()).toBe("Bicycle");
  expect(tag.findComponent(AppIcon).props("icon")).toBe("mdi-bike");
  const indicator = keep(
    mount(LegendIndicator, {
      props: { legend, size: 20 },
      global: { stubs, mocks: { getContrastColor } },
    }),
  );
  expect(indicator.find(".color-rectangle").exists()).toBe(true);
  await indicator.setProps({ legend: { ...legend, icon: "mdi-bike" } });
  expect(indicator.findComponent(AppIcon).exists()).toBe(true);
});
it("displays avatar initials, online duration and overflow names", async () => {
  const users = ref(
    Array.from({ length: 7 }, (_, i) => ({
      peerId: String(i),
      userId: i,
      username: `user${i}`,
      name: `Person ${i}`,
      connectedAt: Date.now() - 86400000,
    })),
  );
  const store = {
    displayedOnlineUsers: users,
    displayedUserCount: computed(() => users.value.length),
    getUserDisplayName: (user: { name: string }) => user.name,
    getUserInitials: () => "PP",
    getUserAvatarColor: () => "#424242",
  };
  vi.stubGlobal("useOnlineUsers", () => store);
  const avatar = keep(
    mount(UserAvatar, { props: { user: users.value[0]! }, global: { stubs } }),
  );
  expect(avatar.text()).toBe("PP");
  expect(avatar.findComponent(Tooltip).props("text")).toContain("1d geleden");
  for (const [elapsed, label] of [
    [3600000, "1u"],
    [60000, "1m"],
    [0, "zojuist"],
  ] as const) {
    await avatar.setProps({
      user: { ...users.value[0]!, connectedAt: Date.now() - elapsed },
      size: "20",
    });
    expect(avatar.findComponent(Tooltip).props("text")).toContain(label);
  }
  await avatar.setProps({ showTooltip: false });
  expect(avatar.findComponent(Tooltip).props("text")).toBe("");
  const online = keep(
    mount(OnlineUsers, { global: { stubs: { ...stubs, UserAvatar: true } } }),
  );
  expect(online.text()).toContain("+3");
  expect(online.findComponent(Tooltip).props("text")).toContain("Person 4");
  await online.setProps({ maxAvatars: 2 });
  expect(online.findComponent(Tooltip).props("text")).toContain("anderen");
  users.value = users.value.slice(0, 1);
  await flushPromises();
  expect(online.findAllComponents({ name: "UserAvatar" })).toHaveLength(1);
});
it("switches mobile content to desktop and closes the mobile panel", async () => {
  mobile.value = true;
  const wrapper = keep(
    mount(MobileCollapsible, {
      props: { title: "Legend", modelValue: true },
      slots: { default: "Content" },
      global: {
        stubs: {
          VExpansionPanels: Slot,
          VExpansionPanel: Slot,
          VExpansionPanelTitle: Slot,
          VExpansionPanelText: Slot,
        },
      },
    }),
  );
  expect(wrapper.text()).toContain("Legend");
  mobile.value = false;
  await flushPromises();
  expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([false]);
  expect(wrapper.text()).toBe("Content");
});
it("opens the intro editor only for authenticated users and renders configured rich text", async () => {
  vi.stubGlobal("useTitle", vi.fn());
  vi.stubGlobal("useTexts", () => ({
    getText: () => ({
      key: "intro.content",
      text: "<h1>Welcome</h1>",
      text_type: "rich",
    }),
  }));
  const wrapper = keep(
    mount(Intro, {
      global: {
        stubs: { ...stubs, TextEditorDialog: Field },
        directives: { tooltip: () => {} },
      },
    }),
  );
  expect(wrapper.get("h1").text()).toBe("Welcome");
  await wrapper.get("button").trigger("click");
  expect(wrapper.getComponent(Field).props("modelValue")).toBe(true);
  auth.value = "unauthenticated";
  await flushPromises();
  expect(
    wrapper.find('button[aria-label="Introductie bewerken"]').exists(),
  ).toBe(false);
  expect(wrapper.get("h1").text()).toBe("Welcome");
});
it("routes relative description links locally and preserves external/hash links", async () => {
  const navigate = vi.fn(),
    toggleTag = vi.fn();
  vi.stubGlobal("navigateTo", navigate);
  vi.stubGlobal("useTagFilters", () => ({ toggleTag }));
  vi.stubGlobal("useTagsApi", () => ({
    getTag: (tag: string) => ({ tag, label: tag }),
  }));
  vi.stubGlobal("useStreetViewEmbeds", useStreetViewEmbeds);
  const issue = {
    ...legend,
    title: "Crossing",
    description:
      '<a href="/kaart/2?cat=1#detail"><span>Local</span></a><a href="https://example.test">External</a><a href="#same">Hash</a>',
    tags: ["bike"],
    legend,
  } as unknown as Issue;
  const wrapper = keep(
    mount(IssueDetails, {
      props: { issue },
      global: {
        stubs: {
          ...stubs,
          ImageViewer: Slot,
          CategoryChip: true,
          Tag: defineComponent({
            template: '<button class="tag">Tag</button>',
          }),
        },
      },
    }),
  );
  await wrapper.get("a span").trigger("click");
  expect(navigate).toHaveBeenCalledWith("/kaart/2?cat=1#detail");
  wrapper
    .findAll("a")[1]!
    .element.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
  await wrapper.findAll("a")[1]!.trigger("click");
  await wrapper.findAll("a")[2]!.trigger("click");
  expect(navigate).toHaveBeenCalledTimes(1);
  await wrapper.get("button.tag").trigger("click");
  expect(toggleTag).toHaveBeenCalledWith("bike");
  await wrapper.setProps({
    issue: { ...issue, description: "<p>Updated</p>" },
  });
  expect(wrapper.text()).toContain("Updated");
});
it("renders issue details while the category is unavailable and shows it when loaded", async () => {
  vi.stubGlobal("useTagFilters", () => ({ toggleTag: vi.fn() }));
  vi.stubGlobal("useTagsApi", () => ({ getTag: vi.fn() }));
  vi.stubGlobal("useStreetViewEmbeds", useStreetViewEmbeds);
  const issue = {
    title: "Crossing",
    description: "<p>Details</p>",
    tags: [],
  } as unknown as Issue;
  const wrapper = keep(
    mount(IssueDetails, {
      props: { issue },
      global: {
        mocks: { getContrastColor },
        stubs: { ...stubs, ImageViewer: Slot, CategoryChip },
      },
    }),
  );
  expect(wrapper.get("h1").text()).toBe("Crossing");
  expect(wrapper.text()).toContain("Details");
  expect(wrapper.findComponent(CategoryChip).exists()).toBe(false);
  await wrapper.setProps({ issue: { ...issue, legend } });
  expect(wrapper.findComponent(CategoryChip).text()).toContain("Routes");
});
it("shares the current URL and title through the native share dialog", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(browserNavigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(browserNavigator, "canShare", {
    configurable: true,
    value: vi.fn().mockReturnValue(true),
  });
  const wrapper = keep(
    mount(ShareButton, { props: { title: "Crossing" }, global: { stubs } }),
  );
  await flushPromises();
  expect(wrapper.get("button").attributes("aria-label")).toBe(
    "Deel dit onderwerp",
  );
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(share).toHaveBeenCalledWith({
    title: "Crossing",
    url: window.location.href,
  });
  expect(showError).not.toHaveBeenCalled();
  expect(showSuccess).not.toHaveBeenCalled();
});
it("copies the URL when native sharing is unavailable", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const wrapper = keep(
    mount(ShareButton, {
      props: { url: "https://example.test/onderwerp" },
      global: { stubs },
    }),
  );
  await flushPromises();
  expect(wrapper.get("button").attributes("aria-label")).toBe(
    "Deel dit onderwerp",
  );
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(writeText).toHaveBeenCalledWith("https://example.test/onderwerp");
  expect(showSuccess).toHaveBeenCalledWith("URL gekopieerd!");
});
it("ignores cancelled shares and reports other sharing errors", async () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const share = vi
    .fn()
    .mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"))
    .mockRejectedValueOnce(new Error("Denied"));
  Object.defineProperty(browserNavigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(browserNavigator, "canShare", {
    configurable: true,
    value: vi.fn().mockReturnValue(true),
  });
  const wrapper = keep(mount(ShareButton, { global: { stubs } }));
  await flushPromises();
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(showError).not.toHaveBeenCalled();
  expect(showPersistent).not.toHaveBeenCalled();
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(showPersistent).toHaveBeenCalledWith(
    "Delen mislukt: Error: Denied. URL kopiëren is niet beschikbaar.",
    "error",
  );
  expect(warning).toHaveBeenCalledWith(
    "Native sharing failed:",
    expect.any(Error),
  );
});
it("copies the new issue URL when a subsequent native share fails and allows sharing again", async () => {
  const failure = new DOMException("Share already active", "InvalidStateError");
  const share = vi
    .fn()
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(failure)
    .mockResolvedValueOnce(undefined);
  const writeText = vi.fn().mockResolvedValue(undefined);
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  Object.defineProperty(browserNavigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(browserNavigator, "canShare", {
    configurable: true,
    value: vi.fn().mockReturnValue(true),
  });
  vi.stubGlobal("navigator", {
    canShare: () => true,
    clipboard: { writeText },
  });
  const wrapper = keep(
    mount(ShareButton, {
      props: { title: "First", url: "https://example.test/first" },
      global: { stubs },
    }),
  );
  await wrapper.get("button").trigger("click");
  await flushPromises();
  await wrapper.setProps({
    title: "Second",
    url: "https://example.test/second",
  });
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(share).toHaveBeenNthCalledWith(2, {
    title: "Second",
    url: "https://example.test/second",
  });
  expect(writeText).toHaveBeenCalledExactlyOnceWith(
    "https://example.test/second",
  );
  expect(showPersistent).toHaveBeenCalledWith(
    "Delen mislukt: InvalidStateError: Share already active. URL gekopieerd!",
    "warning",
  );
  expect(showError).not.toHaveBeenCalled();
  expect(warning).toHaveBeenCalledWith("Native sharing failed:", failure);
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(share).toHaveBeenCalledTimes(3);
  expect(writeText).toHaveBeenCalledTimes(1);
});
it("reports unavailable and rejected clipboard access", async () => {
  vi.stubGlobal("navigator", {});
  const wrapper = keep(mount(ShareButton, { global: { stubs } }));
  await flushPromises();
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(showError).toHaveBeenCalledWith(
    "Browser ondersteunt geen clipboard, kan URL niet kopiëren.",
  );
  vi.stubGlobal("navigator", {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
  });
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(showError).toHaveBeenCalledWith("URL kon niet worden gekopieerd.");
});
it("saves text entries, keeps failed edits open and cancels without saving", async () => {
  const updateText = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(undefined);
  vi.stubGlobal("useTexts", () => ({ updateText }));
  const wrapper = keep(
    mount(TextEditor, {
      props: {
        modelValue: true,
        entry: { key: "header", text: "Old", text_type: "plain" },
      },
      global: { stubs: { ...stubs, VTextarea: Field } },
    }),
  );
  await wrapper.get("input").setValue("New");
  await wrapper.findAll("button")[1]!.trigger("click");
  await flushPromises();
  expect(wrapper.text()).toContain("De tekst kon niet worden opgeslagen");
  expect(wrapper.emitted("saved")).toBeUndefined();
  await wrapper.findAll("button")[1]!.trigger("click");
  await flushPromises();
  expect(updateText).toHaveBeenLastCalledWith("header", "New");
  expect(wrapper.emitted("saved")).toHaveLength(1);
  await wrapper.findAll("button")[0]!.trigger("click");
  expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([false]);
});
it("opens desktop image previews and prevents mobile lightboxes", async () => {
  vi.stubGlobal(
    "Image",
    class {
      width = 1000;
      height = 2000;
      onload?: () => void;
      set src(_url: string) {
        this.onload?.();
      }
    },
  );
  const wrapper = keep(
    mount(ImageViewer, {
      slots: {
        default: '<img src="https://example.test/photo.png"><p>Text</p>',
      },
      global: { stubs },
    }),
  );
  await wrapper.get("img").trigger("click");
  expect(wrapper.findAll("img")).toHaveLength(2);
  expect(wrapper.get(".dialog-image").attributes("src")).toContain("photo.png");
  mobile.value = true;
  const second = keep(
    mount(ImageViewer, {
      slots: { default: '<img src="https://example.test/photo.png">' },
      global: { stubs },
    }),
  );
  await second.get("img").trigger("click");
  expect(second.findAll("img")).toHaveLength(1);
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import IssueComments from "../app/components/IssueComments.client.vue";
import CommentEditor from "../app/components/CommentEditor.client.vue";
import StreetViewDialog from "../app/components/StreetViewDialog.vue";
import { getContrastColor } from "../app/utils/getContrastColor";
import { useStreetViewEmbeds } from "../app/composables/useStreetViewEmbeds";
import { isQuillContentEmpty } from "../app/utils/quillConfig";
import type { Issue } from "../shared/types/Issue";

vi.mock("@vueup/vue-quill", () => ({
  QuillEditor: { name: "QuillEditor", template: "<div />" },
  loadQuill: vi.fn().mockResolvedValue({ register: vi.fn() }),
}));
vi.mock("quill-image-compress", () => ({
  imageCompressor: {}
}));

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
  // Firefox for Android can reject every subsequent share: https://bugzilla.mozilla.org/show_bug.cgi?id=2063832
  const failure = new DOMException("Share already active", "InvalidStateError");
  const share = vi
    .fn()
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(failure)
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
  expect(showSuccess).toHaveBeenCalledExactlyOnceWith("URL gekopieerd!");
  expect(showPersistent).not.toHaveBeenCalled();
  expect(showError).not.toHaveBeenCalled();
  expect(warning).toHaveBeenCalledWith("Native sharing failed:", failure);
  await wrapper.setProps({
    title: "Third",
    url: "https://example.test/third",
  });
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(share).toHaveBeenCalledTimes(3);
  expect(writeText).toHaveBeenNthCalledWith(2, "https://example.test/third");
  expect(showSuccess).toHaveBeenCalledTimes(2);
  expect(showPersistent).not.toHaveBeenCalled();
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(share).toHaveBeenCalledTimes(4);
  expect(writeText).toHaveBeenCalledTimes(2);
});
it("reports when copying also fails after a native sharing error", async () => {
  const failure = new DOMException("Share already active", "InvalidStateError");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  Object.defineProperty(browserNavigator, "share", {
    configurable: true,
    value: vi.fn().mockRejectedValue(failure),
  });
  Object.defineProperty(browserNavigator, "canShare", {
    configurable: true,
    value: () => true,
  });
  const writeText = vi.fn().mockRejectedValue(new Error("Denied"));
  vi.stubGlobal("navigator", {
    canShare: () => true,
    clipboard: { writeText },
  });
  const wrapper = keep(mount(ShareButton, { global: { stubs } }));
  await flushPromises();
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(writeText).toHaveBeenCalledExactlyOnceWith(window.location.href);
  expect(showSuccess).not.toHaveBeenCalled();
  expect(showPersistent).toHaveBeenCalledWith(
    "Delen mislukt: InvalidStateError: Share already active. URL kon ook niet worden gekopieerd.",
    "error",
  );
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

it("renders comments only for authenticated users on IssueDetails and excludes them when logged out", async () => {
    vi.stubGlobal("useTagFilters", () => ({ toggleTag: vi.fn() }));
    vi.stubGlobal("useTagsApi", () => ({ getTag: vi.fn() }));
    vi.stubGlobal("useStreetViewEmbeds", useStreetViewEmbeds);
    const IssueCommentsStub = defineComponent({ props: ["issueId"], template: '<div class="issue-comments-stub">Comments for {{ issueId }}</div>' });
    const issue = { id: 42, title: "Issue with comments", description: "<p>Details</p>", tags: [] } as unknown as Issue;

    auth.value = "authenticated";
    const wrapper = keep(mount(IssueDetails, { props: { issue }, global: { stubs: { ...stubs, ImageViewer: Slot, CategoryChip: true, IssueComments: IssueCommentsStub } } }));
    expect(wrapper.find(".issue-comments-stub").exists()).toBe(true);
    expect(wrapper.find(".issue-comments-stub").text()).toBe("Comments for 42");

    auth.value = "unauthenticated";
    await flushPromises();
    expect(wrapper.find(".issue-comments-stub").exists()).toBe(false);
});

it("manages issue comments lifecycle, permissions, edits, deletions and live WebSocket updates", async () => {
    const list = vi.fn().mockResolvedValue([
        { id: 1, issue_id: 10, author_id: 1, author_name: "Alice", body: "<p>First comment</p>", created_at: "2026-01-01T10:00:00Z", updated_at: null, deleted_at: null, is_deleted: false },
        { id: 2, issue_id: 10, author_id: 2, author_name: "Bob", body: "[deleted comment]", created_at: "2026-01-01T11:00:00Z", updated_at: null, deleted_at: "2026-01-01T12:00:00Z", is_deleted: true },
    ]);
    const create = vi.fn().mockResolvedValue({ id: 3, issue_id: 10, author_id: 1, author_name: "Alice", body: "<p>Brand new</p>", created_at: "2026-01-01T13:00:00Z", updated_at: null, deleted_at: null, is_deleted: false });
    const update = vi.fn().mockResolvedValue({ id: 1, issue_id: 10, author_id: 1, author_name: "Alice", body: "<p>Updated text</p>", created_at: "2026-01-01T10:00:00Z", updated_at: "2026-01-01T14:00:00Z", deleted_at: null, is_deleted: false });
    const remove = vi.fn().mockResolvedValue({ id: 1, deleted: true, soft: true });

    vi.stubGlobal("useCommentsApi", () => ({ list, create, update, remove }));
    vi.stubGlobal("useAuth", () => ({ status: ref("authenticated"), data: ref({ id: 1, name: "Alice", role: "user" }), token: ref("Bearer token") }));
    vi.stubGlobal("useConnectionStatus", () => ({ isConnected: ref(true) }));
    vi.stubGlobal("useStreetViewEmbeds", useStreetViewEmbeds);
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));

    let wsSubscriber: ((msg: unknown) => void) | null = null;
    vi.stubGlobal("useSharedAuthWebSocket", () => ({
        subscribe: (cb: (msg: unknown) => void) => {
            wsSubscriber = cb;
            return () => { wsSubscriber = null; };
        },
    }));

    const CommentEditorStub = defineComponent({
        name: "CommentEditor",
        props: ["modelValue", "submitText", "loading"],
        emits: ["submit", "cancel", "update:modelValue"],
        template: '<div class="comment-editor-stub"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><button class="submit-btn" @click="$emit(\'submit\', modelValue)">{{ submitText }}</button><button class="cancel-btn" @click="$emit(\'cancel\')">Cancel</button></div>',
    });

    const wrapper = keep(mount(IssueComments, { props: { issueId: 10 }, global: { stubs: { ...stubs, ImageViewer: Slot, CommentEditor: CommentEditorStub } } }));

    await flushPromises();
    expect(list).toHaveBeenCalledWith(10);
    expect(wrapper.text()).toContain("Alice");
    expect(wrapper.text()).toContain("First comment");
    expect(wrapper.text()).toContain("[deleted comment]");

    // Edit own comment
    const editBtn = wrapper.find('button[aria-label="Opmerking bewerken"]');
    expect(editBtn.exists()).toBe(true);
    await editBtn.trigger("click");
    expect(wrapper.find(".comment-editor-stub").exists()).toBe(true);
    await wrapper.find(".comment-editor-stub input").setValue("<p>Updated text</p>");
    await wrapper.find(".comment-editor-stub .submit-btn").trigger("click");
    await flushPromises();
    expect(update).toHaveBeenCalledWith(1, "<p>Updated text</p>");
    expect(showSuccess).toHaveBeenCalledWith("Opmerking gewijzigd");

    // Delete comment
    const deleteBtn = wrapper.find('button[aria-label="Opmerking verwijderen"]');
    await deleteBtn.trigger("click");
    await flushPromises();
    expect(remove).toHaveBeenCalledWith(1);
    expect(showSuccess).toHaveBeenCalledWith("Opmerking verwijderd");

    // Create new comment
    const newEditor = wrapper.findAllComponents(CommentEditorStub).at(-1)!;
    newEditor.vm.$emit("update:modelValue", "<p>Brand new</p>");
    newEditor.vm.$emit("submit", "<p>Brand new</p>");
    await flushPromises();
    expect(create).toHaveBeenCalledWith(10, "<p>Brand new</p>");
    expect(showSuccess).toHaveBeenCalledWith("Opmerking geplaatst");

    // WebSocket message handling
    expect(wsSubscriber).toBeTruthy();
    wsSubscriber!({
        type: "comment-created",
        payload: { id: 4, issue_id: 10, author_id: 3, author_name: "Charlie", body: "<p>Live comment</p>", created_at: "2026-01-01T15:00:00Z", updated_at: null, deleted_at: null, is_deleted: false },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Charlie");
    expect(wrapper.text()).toContain("Live comment");

    wsSubscriber!({
        type: "comment-modified",
        payload: { id: 4, issue_id: 10, author_id: 3, author_name: "Charlie", body: "<p>Modified live</p>", created_at: "2026-01-01T15:00:00Z", updated_at: "2026-01-01T15:30:00Z", deleted_at: null, is_deleted: false },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Modified live");

    wsSubscriber!({
        type: "comment-deleted",
        payload: { id: 4, issue_id: 10, deletedBy: "Charlie", deletedByUserId: 3, soft: true },
    });
    await flushPromises();
    expect(wrapper.find(".comment-deleted").exists()).toBe(true);
});

it("validates CommentEditor submission constraints and inserts Street View embeds", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("$fetch", fetchMock);
    vi.stubGlobal("useAuth", () => ({ token: ref("Bearer token") }));
    vi.stubGlobal("useConnectionStatus", () => ({ isConnected: ref(true) }));

    const wrapper = keep(mount(CommentEditor, {
        props: { modelValue: "", placeholder: "Schrijf een opmerking..." },
        global: {
            stubs: {
                ...stubs,
                QuillEditor: defineComponent({
                    methods: {
                        getQuill: () => ({
                            getLength: () => 0,
                            getSelection: () => ({ index: 0, length: 0 }),
                            insertEmbed: vi.fn(),
                            setSelection: vi.fn(),
                        }),
                    },
                    template: "<div />",
                }),
            },
        },
    }));

    // Disabled initially because content is empty
    const submitBtn = wrapper.findAll("button").find((b) => b.text() === "Plaatsen")!;
    expect(submitBtn.attributes("disabled")).toBeDefined();

    // Enable when non-empty
    await wrapper.setProps({ modelValue: "<p>Non-empty content</p>" });
    expect(submitBtn.attributes("disabled")).toBeUndefined();
    await submitBtn.trigger("click");
    expect(wrapper.emitted("submit")?.at(-1)).toEqual(["<p>Non-empty content</p>"]);

    // Street view preview insertion
    const svBtn = wrapper.findAll("button").find((b) => b.text().includes("Street View toevoegen"))!;
    await svBtn.trigger("click");
    const svInput = wrapper.findAll("input").at(-1)!;
    await svInput.setValue("https://maps.app.goo.gl/street");

    const preview = { lat: 52.1, lng: 5.1, heading: 10, pitch: 0, fov: 90, panoId: "pano123", previewDataUrl: "data:image/png;base64,123", embedSrc: "https://embed.google.com" };
    fetchMock.mockResolvedValueOnce(preview);
    const getPreviewBtn = wrapper.findAll("button").find((b) => b.text() === "Ophalen")!;
    await getPreviewBtn.trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/streetview/parse", expect.objectContaining({ body: { url: "https://maps.app.goo.gl/street" } }));
    const insertBtn = wrapper.findAll("button").find((b) => b.text() === "Invoegen")!;
    await insertBtn.trigger("click");
    await flushPromises();
});

it("identifies empty Quill HTML content correctly", () => {
    expect(isQuillContentEmpty("")).toBe(true);
    expect(isQuillContentEmpty("<p><br></p>")).toBe(true);
    expect(isQuillContentEmpty("<p>   </p>")).toBe(true);
    expect(isQuillContentEmpty('<p><img src="foo.png"></p>')).toBe(false);
    expect(isQuillContentEmpty('<div class="streetview-embed"></div>')).toBe(false);
    expect(isQuillContentEmpty("<p>Hello world</p>")).toBe(false);
});

describe("StreetViewDialog", () => {
    function mountDialog(props = { modelValue: true }) {
        return keep(mount(StreetViewDialog, { props, global: { stubs } }));
    }

    it("emits false on update:modelValue when cancelled", async () => {
        const wrapper = mountDialog();
        const cancelBtn = wrapper.findAll("button").find((b) => b.text() === "Annuleren")!;

        await cancelBtn.trigger("click");

        expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([false]);
    });

    it("displays error message when Street View parsing fails", async () => {
        const fetchMock = vi.fn().mockRejectedValueOnce({ data: { message: "Invalid URL" } });
        vi.stubGlobal("$fetch", fetchMock);
        vi.stubGlobal("useAuth", () => ({ token: ref("Bearer auth-token") }));

        const wrapper = mountDialog();
        await wrapper.find("input").setValue("https://maps.app.goo.gl/fail");

        const getBtn = wrapper.findAll("button").find((b) => b.text() === "Ophalen")!;
        await getBtn.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("Invalid URL");
    });

    it("fetches preview and emits insert event with parsed embed payload", async () => {
        const preview = {
            lat: 52.3,
            lng: 4.9,
            heading: 180,
            pitch: 0,
            fov: 90,
            panoId: "pano999",
            previewDataUrl: "data:image/png;base64,abc",
            embedSrc: "https://maps.google.com/embed",
        };
        const fetchMock = vi.fn().mockResolvedValueOnce(preview);
        vi.stubGlobal("$fetch", fetchMock);
        vi.stubGlobal("useAuth", () => ({ token: ref("Bearer auth-token") }));

        const wrapper = mountDialog();
        await wrapper.find("input").setValue("https://maps.app.goo.gl/success");

        const getBtn = wrapper.findAll("button").find((b) => b.text() === "Ophalen")!;
        await getBtn.trigger("click");
        await flushPromises();

        expect(wrapper.find("img.streetview-dialog-preview").attributes("src")).toBe("data:image/png;base64,abc");

        const insertBtn = wrapper.findAll("button").find((b) => b.text() === "Invoegen")!;
        await insertBtn.trigger("click");

        expect(wrapper.emitted("insert")?.at(-1)).toEqual([preview]);
        expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([false]);
    });
});

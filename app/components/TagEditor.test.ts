// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, watch, computed } from "vue";
import type { ComponentPublicInstance } from "vue";
import TagEditor from "./TagEditor.vue";
import type { SanitizedHTML } from "~~/shared/types/SanitizedHTML";
import { SanitizedHTML as SanitizedHTMLFactory } from "~~/shared/types/SanitizedHTML";
import type { Tag } from "~~/shared/types/Tag";

interface TagEditorVM extends ComponentPublicInstance {
  isDialogOpen: boolean;
  form: {
    tag: string;
    label: string;
    description: SanitizedHTML;
    icon?: string;
  };
  valid: boolean;
  saving: boolean;
  isEditing: boolean;
  editingTagId: number | null;
  openCreateDialog: () => void;
  openEditDialog: (tag: Tag) => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  richTextEditorRef: { sanitize: () => void } | null;
}

// Mock composables before importing TagEditor
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockShowError = vi.fn();

vi.mock("#app", () => ({
  definePageMeta: vi.fn(),
}));

describe("TagEditor.vue", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    // Reset mocks
    mockCreate.mockClear();
    mockUpdate.mockClear();
    mockShowError.mockClear();

    // Make Vue composition API functions available globally
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("computed", computed);

    // Mock composables used by TagEditor
    vi.stubGlobal("useTagsApi", () => ({
      create: mockCreate,
      update: mockUpdate,
    }));

    vi.stubGlobal("useSnackbar", () => ({
      showError: mockShowError,
    }));

    vi.stubGlobal("normalizeSlug", (text: string) => {
      if (!text) return "";
      return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");
    });

    vi.stubGlobal("sanitizeDescriptionOptions", () => ({}));

    wrapper = mount(TagEditor, {
      props: {
        open: false,
      },
      global: {
        stubs: {
          "v-dialog": true,
          "v-card": true,
          "v-card-title": true,
          "v-card-text": true,
          "v-card-actions": true,
          "v-form": true,
          "v-row": true,
          "v-col": true,
          "v-text-field": true,
          "v-btn": true,
          "v-spacer": true,
          AppIcon: true,
          RichTextEditor: true,
          IconSelector: true,
        },
        mocks: {
          $fetch: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it("mounts successfully", () => {
    expect(wrapper.exists()).toBe(true);
  });

  it("initializes with closed dialog", () => {
    const vm = wrapper.vm as TagEditorVM;
    expect(vm.isDialogOpen).toBe(false);
  });

  it("opens create dialog with empty form", () => {
    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();

    expect(vm.isDialogOpen).toBe(true);
    expect(vm.isEditing).toBe(false);
    expect(vm.form.label).toBe("");
    expect(vm.form.tag).toBe("");
    expect(vm.form.description).toBe("");
    expect(vm.form.icon).toBeUndefined();
  });

  it("opens edit dialog with tag data", () => {
    const testTag: Tag = {
      id: 1,
      tag: "test-tag",
      label: "Test Label",
      description: SanitizedHTMLFactory.from("<p>Test description</p>"),
      icon: "mdi-tag",
    };

    const vm = wrapper.vm as TagEditorVM;
    vm.openEditDialog(testTag);

    expect(vm.isDialogOpen).toBe(true);
    expect(vm.isEditing).toBe(true);
    expect(vm.editingTagId).toBe(1);
    expect(vm.form.tag).toBe("test-tag");
    expect(vm.form.label).toBe("Test Label");
    expect(vm.form.description).toBe("<p>Test description</p>");
    expect(vm.form.icon).toBe("mdi-tag");
  });

  it("handles tag with null label by using tag as fallback", () => {
    const testTag: Tag = {
      id: 1,
      tag: "fallback-tag",
      label: null,
      description: null,
      icon: null,
    };

    const vm = wrapper.vm as TagEditorVM;
    vm.openEditDialog(testTag);

    expect(vm.form.label).toBe("fallback-tag");
  });

  it("handles tag with null description by initializing as empty SanitizedHTML", () => {
    const testTag: Tag = {
      id: 1,
      tag: "test-tag",
      label: "Test",
      description: null,
      icon: null,
    };

    const vm = wrapper.vm as TagEditorVM;
    vm.openEditDialog(testTag);

    expect(vm.form.description).toBe("");
  });

  it("handles tag with null icon by leaving it undefined", () => {
    const testTag: Tag = {
      id: 1,
      tag: "test-tag",
      label: "Test",
      description: SanitizedHTMLFactory.from("<p>Desc</p>"),
      icon: null,
    };

    const vm = wrapper.vm as TagEditorVM;
    vm.openEditDialog(testTag);

    expect(vm.form.icon).toBeUndefined();
  });

  it("auto-generates slug from label", async () => {
    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();

    vm.form.label = "My Test Tag";
    await wrapper.vm.$nextTick();

    expect(vm.form.tag).toBe("my-test-tag");
  });

  it("updates slug when label changes", async () => {
    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();

    vm.form.label = "First Name";
    await wrapper.vm.$nextTick();
    expect(vm.form.tag).toBe("first-name");

    vm.form.label = "Another Name";
    await wrapper.vm.$nextTick();
    expect(vm.form.tag).toBe("another-name");
  });

  it("cancels edit and resets form", () => {
    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();

    vm.form.label = "Test";
    vm.form.description = SanitizedHTMLFactory.from("<b>Test</b>");

    vm.handleCancel();

    expect(vm.isDialogOpen).toBe(false);
    expect(vm.form.label).toBe("");
    expect(vm.form.description).toBe("");
    expect(vm.isEditing).toBe(false);
    expect(vm.editingTagId).toBeNull();
  });

  it("emits saved event after successful save", async () => {
    mockCreate.mockResolvedValue({});

    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();
    vm.form.label = "New Tag";
    vm.form.tag = "new-tag"; // Set explicitly
    vm.form.description = SanitizedHTMLFactory.from("<p>Description</p>");
    vm.form.icon = "mdi-tag";

    vm.richTextEditorRef = {
      sanitize: vi.fn(),
    };

    await vm.handleSave();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("saved")).toBeTruthy();
  });

  it("trims and normalizes payload before saving", async () => {
    mockCreate.mockResolvedValue({});

    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();

    vm.form.label = "  Spaces Label  ";
    vm.form.tag = "spaces-label"; // Set explicitly since watcher might not trigger
    vm.form.description = SanitizedHTMLFactory.from("  <b>Desc</b>  ");
    vm.form.icon = "  mdi-tag  ";

    vm.richTextEditorRef = {
      sanitize: vi.fn(),
    };

    await vm.handleSave();
    await wrapper.vm.$nextTick();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Spaces Label",
        icon: "mdi-tag",
      }),
    );
  });

  it("handles save error gracefully", async () => {
    const mockError = new Error("API Error");
    mockCreate.mockRejectedValue(mockError);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();
    vm.form.label = "Test";
    vm.form.tag = "test"; // Make sure tag is set so handleSave doesn't early return

    vm.richTextEditorRef = {
      sanitize: vi.fn(),
    };

    await vm.handleSave();
    await wrapper.vm.$nextTick();

    expect(mockShowError).toHaveBeenCalledWith("Tag kon niet worden opgeslagen");
    expect(vm.saving).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it("calls RichTextEditor sanitize method on save", async () => {
    mockCreate.mockResolvedValue({});

    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();
    vm.form.label = "Test";

    const sanitizeSpy = vi.fn();
    vm.richTextEditorRef = {
      sanitize: sanitizeSpy,
    };

    await vm.handleSave();

    expect(sanitizeSpy).toHaveBeenCalled();
  });

  it("uses update instead of create when editing", async () => {
    mockUpdate.mockResolvedValue({});

    const testTag: Tag = {
      id: 42,
      tag: "test-tag",
      label: "Test Label",
      description: SanitizedHTMLFactory.from("<p>Test</p>"),
      icon: "mdi-tag",
    };

    const vm = wrapper.vm as TagEditorVM;
    vm.openEditDialog(testTag);
    vm.form.label = "Updated Label";

    vm.richTextEditorRef = {
      sanitize: vi.fn(),
    };

    await vm.handleSave();
    await wrapper.vm.$nextTick();

    expect(mockUpdate).toHaveBeenCalledWith(42, expect.any(Object));
  });

  it("sets saving flag during save operation", async () => {
    mockCreate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10)),
    );

    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();
    vm.form.label = "Test";
    vm.form.tag = "test"; // Make sure tag is set so handleSave doesn't early return

    vm.richTextEditorRef = {
      sanitize: vi.fn(),
    };

    const savePromise = vm.handleSave();
    await wrapper.vm.$nextTick(); // Allow saving flag to be set

    expect(vm.saving).toBe(true);

    await savePromise;
    expect(vm.saving).toBe(false);
  });

  it("handles empty label by using tag as fallback in payload", async () => {
    mockCreate.mockResolvedValue({});

    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();
    vm.form.label = "";
    vm.form.tag = "fallback-tag";

    vm.richTextEditorRef = {
      sanitize: vi.fn(),
    };

    await vm.handleSave();
    await wrapper.vm.$nextTick();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "fallback-tag",
      }),
    );
  });

  it("handles empty description by setting to null", async () => {
    mockCreate.mockResolvedValue({});

    const vm = wrapper.vm as TagEditorVM;
    vm.openCreateDialog();
    vm.form.label = "Test";
    vm.form.tag = "test"; // Make sure tag is set so handleSave doesn't early return
    vm.form.description = "" as SanitizedHTML;

    vm.richTextEditorRef = {
      sanitize: vi.fn(),
    };

    await vm.handleSave();
    await wrapper.vm.$nextTick();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
      }),
    );
  });
});

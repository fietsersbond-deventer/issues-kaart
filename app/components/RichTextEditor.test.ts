// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, ref, watch, computed } from "vue";
import type { ComponentPublicInstance } from "vue";
import RichTextEditor from "./RichTextEditor.vue";
import type { SanitizedHTML } from "~~/shared/types/SanitizedHTML";
import { SanitizedHTML as SanitizedHTMLFactory } from "~~/shared/types/SanitizedHTML";

vi.mock("@vueup/vue-quill", () => ({
  QuillEditor: defineComponent({
    name: "QuillEditor",
    props: ["content", "contentType", "toolbar"],
    emits: ["update:content", "blur"],
    template: `
      <div class="quill-editor-mock">
        <input 
          v-model="localContent" 
          @blur="$emit('blur')"
          @input="$emit('update:content', localContent)"
        />
      </div>
    `,
    setup(props) {
      const localContent = ref(props.content || "");
      return { localContent };
    },
  }),
}));

interface RichTextEditorVM extends ComponentPublicInstance {
  localContent: string;
  modelValue: unknown; // SanitizedHTML type
  sanitize: () => void;
  onBlur: () => Promise<void>;
  toolbar: unknown[];
  $props: {
    modelValue: unknown; // SanitizedHTML
    sanitizeOptions?: Record<string, unknown>;
  };
}

describe("RichTextEditor.vue", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    // Make Vue composition API functions available globally
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("computed", computed);

    wrapper = mount(RichTextEditor, {
      props: {
        modelValue: SanitizedHTMLFactory.from("<b>Test</b>"),
      },
      global: {
        mocks: {
          $fetch: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    wrapper.unmount();
  });

  it("renders the component", () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.findComponent({ name: "QuillEditor" }).exists()).toBe(true);
  });

  it("initializes localContent with modelValue", () => {
    const vm = wrapper.vm as RichTextEditorVM;
    expect(vm.localContent).toBe("<b>Test</b>");
  });

  it("exposes sanitize method", () => {
    const vm = wrapper.vm as RichTextEditorVM;
    expect(typeof vm.sanitize).toBe("function");
  });

  it("has correct toolbar configuration", () => {
    const vm = wrapper.vm as RichTextEditorVM;
    expect(vm.toolbar).toBeDefined();
    expect(Array.isArray(vm.toolbar)).toBe(true);
    expect(JSON.stringify(vm.toolbar)).toContain("bold");
    expect(JSON.stringify(vm.toolbar)).toContain("italic");
  });

  it("sanitizes HTML on blur event", async () => {
    const vm = wrapper.vm as RichTextEditorVM;
    vm.localContent = "<b>Bold</b><script>alert('xss')</script>";
    await vm.onBlur();
    expect(vm.modelValue).toContain("<b>Bold</b>");
    expect(vm.modelValue).not.toContain("script");
  });

  it("sanitizes content when sanitize method is called", async () => {
    const vm = wrapper.vm as RichTextEditorVM;
    vm.localContent = "<i>Italic</i><img src=x onerror='alert(1)'>";
    vm.sanitize();
    expect(vm.modelValue).toContain("<i>Italic</i>");
    expect(vm.modelValue).not.toContain("img");
    expect(vm.modelValue).not.toContain("onerror");
  });

  it("watches for changes to modelValue prop", async () => {
    await wrapper.setProps({ modelValue: SanitizedHTMLFactory.from("<em>Updated</em>") });
    const vm = wrapper.vm as RichTextEditorVM;
    expect(vm.localContent).toBe("<em>Updated</em>");
  });

  it("accepts custom sanitize options", () => {
    const customWrapper = mount(RichTextEditor, {
      props: {
        modelValue: SanitizedHTMLFactory.from("<p>Test</p>"),
        sanitizeOptions: { allowedTags: ["p", "b"] },
      },
    });
    const vm = customWrapper.vm as RichTextEditorVM;
    expect(vm.$props.sanitizeOptions).toEqual({
      allowedTags: ["p", "b"],
    });
  });

  it("handles empty content", () => {
    const emptyWrapper = mount(RichTextEditor, {
      props: {
        modelValue: SanitizedHTMLFactory.from(""),
      },
    });
    const vm = emptyWrapper.vm as RichTextEditorVM;
    expect(vm.localContent).toBe("");
  });

  it("handles null content by initializing as empty string", () => {
    const nullWrapper = mount(RichTextEditor, {
      props: {
        modelValue: null as unknown as SanitizedHTML,
      },
    });
    const vm = nullWrapper.vm as RichTextEditorVM;
    expect(vm.localContent).toBe("");
  });

  it("preserves allowed tags during sanitization", () => {
    const vm = wrapper.vm as RichTextEditorVM;
    vm.localContent = "<h3>Heading</h3><b>Bold</b> and <i>italic</i>";
    vm.sanitize();
    expect(vm.modelValue).toContain("<h3>Heading</h3>");
    expect(vm.modelValue).toContain("<b>Bold</b>");
    expect(vm.modelValue).toContain("<i>italic</i>");
  });

  it("removes links from content", () => {
    const vm = wrapper.vm as RichTextEditorVM;
    vm.localContent = '<a href="https://example.com">Link</a>';
    vm.sanitize();
    expect(vm.modelValue).not.toContain("<a");
    expect(vm.modelValue).not.toContain("href");
  });

  it("removes images from content", () => {
    const vm = wrapper.vm as RichTextEditorVM;
    vm.localContent = '<img src="test.jpg" alt="test" />';
    vm.sanitize();
    expect(vm.modelValue).not.toContain("<img");
    expect(vm.modelValue).not.toContain("src");
  });
});

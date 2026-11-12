<template>
  <div class="rich-text-editor-container">
    <QuillEditor
      ref="editorRef"
      v-model:content="localContent"
      content-type="html"
      :toolbar="toolbar"
      class="rich-text-editor"
      @blur="onBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import type { SanitizedHTML } from "~~/shared/types/SanitizedHTML";
import { sanitizeDescriptionHtml } from "~~/shared/utils/sanitizeDescriptionHtml";

const modelValue = defineModel<SanitizedHTML>({ required: true });

const localContent = ref<string>(modelValue.value ?? "");
const editorRef = ref<InstanceType<typeof QuillEditor> | null>(null);

watch(
  () => modelValue.value,
  (newValue) => {
    localContent.value = newValue ?? "";
  },
);

function onBlur() {
  const sanitized = sanitizeDescriptionHtml(localContent.value);
  modelValue.value = sanitized;
}

// Expose method for parent to trigger sanitization
function sanitize() {
  const sanitized = sanitizeDescriptionHtml(localContent.value);
  modelValue.value = sanitized;
}

defineExpose({
  sanitize,
});

const toolbar = [
  [{ header: [2, 3, 4, false] }],
  ["bold", "italic"],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [{ indent: "-1" }, { indent: "+1" }],
];
</script>

<style scoped>
.rich-text-editor-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.rich-text-editor {
  min-height: 120px;
}

/* Vuetify theme overrides */
:deep(.ql-toolbar.ql-snow) {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  border-bottom: 1px solid #e0e0e0;
  padding: 8px;
}

:deep(.ql-container.ql-snow) {
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  font-size: 1rem;
}

:deep(.ql-editor) {
  min-height: 120px;
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
}
</style>

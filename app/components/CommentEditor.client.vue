<template>
  <div class="comment-editor">
    <div class="quill-editor-container">
      <QuillEditor
        ref="quillEditorRef"
        v-model:content="content"
        content-type="html"
        :toolbar="defaultQuillToolbar"
        :modules="defaultQuillModules"
        :placeholder="placeholder"
        class="quill-editor"
        :style="{ height: editorHeight }"
      />
    </div>

    <!-- Street View add button -->
    <div class="d-flex justify-space-between align-center mt-1">
      <div class="text-caption text-error">
        {{ errorMessage }}
      </div>
      <v-btn
        size="small"
        variant="text"
        prepend-icon="mdi-google-street-view"
        :disabled="disabled || loading"
        @click="openStreetViewDialog"
      >
        Street View toevoegen
      </v-btn>
    </div>

    <!-- Action buttons -->
    <div class="d-flex justify-end ga-2 mt-2">
      <v-btn
        v-if="showCancel"
        variant="text"
        :disabled="loading"
        @click="onCancel"
      >
        {{ cancelText }}
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        :loading="loading"
        :disabled="disabled || !canSubmit"
        @click="onSubmit"
      >
        {{ submitText }}
      </v-btn>
    </div>

    <!-- Street View dialog -->
    <StreetViewDialog
      v-model="showStreetViewDialog"
      @insert="insertStreetView"
    />
  </div>
</template>

<script setup lang="ts">
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import StreetViewDialog from "./StreetViewDialog.vue";
import {
  defaultQuillToolbar,
  defaultQuillModules,
} from "~/utils/quillConfig";
import {
  ensureStreetViewEmbedBlotRegistered,
  insertStreetViewIntoQuill,
  type StreetViewEmbedValue,
} from "~/utils/streetViewEmbedBlot";

void ensureStreetViewEmbedBlotRegistered();

interface Props {
  modelValue?: string;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
  showCancel?: boolean;
  loading?: boolean;
  disabled?: boolean;
  editorHeight?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "Schrijf een opmerking...",
  submitText: "Plaatsen",
  cancelText: "Annuleren",
  showCancel: false,
  loading: false,
  disabled: false,
  editorHeight: "150px",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [value: string];
  cancel: [];
}>();

const content = computed({
  get: () => props.modelValue,
  set: (val: string) => emit("update:modelValue", val),
});

const { isConnected } = useConnectionStatus();

const quillEditorRef = ref<InstanceType<typeof QuillEditor> | null>(null);
const errorMessage = ref("");

const canSubmit = computed(() => {
  return (
    !!content.value &&
    isConnected.value &&
    !props.loading
  );
});

// Street View dialog logic
const showStreetViewDialog = ref(false);

function openStreetViewDialog() {
  showStreetViewDialog.value = true;
}

async function insertStreetView(preview: StreetViewEmbedValue) {
  await insertStreetViewIntoQuill(
    quillEditorRef.value?.getQuill(),
    preview,
    (code) => {
      content.value = `${content.value ?? ""}${code}`;
    },
  );
}

function onSubmit() {
  if (!canSubmit.value) return;
  emit("submit", content.value);
}

function onCancel() {
  emit("cancel");
}
</script>

<style scoped>
.comment-editor {
  display: flex;
  flex-direction: column;
}

.quill-editor-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

:deep(.ql-container) {
  height: calc(100% - 42px) !important;
}
</style>

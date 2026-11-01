<template>
  <div class="comment-editor">
    <div class="quill-editor-container">
      <QuillEditor
        ref="quillEditorRef"
        v-model:content="content"
        content-type="html"
        :toolbar="toolbar"
        :modules="modules"
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
    <v-dialog v-model="showStreetViewDialog" max-width="600">
      <v-card>
        <v-card-title>Street View toevoegen</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-2">
            Plak hier een Street View link (gebruik de Deel-knop in Google Maps
            terwijl je in Street View staat). Gewone kaartlocaties worden niet
            ondersteund.
          </p>
          <v-text-field
            v-model.trim="streetViewUrl"
            label="Street View link"
            :disabled="isParsing || !!parsedPreview"
            :error-messages="parseError ? [parseError] : []"
            spellcheck="false"
            @keydown.enter.prevent="fetchStreetViewPreview"
          />
          <div v-if="parsedPreview" class="text-center mt-2">
            <img
              :src="parsedPreview.previewDataUrl"
              alt="Street View voorvertoning"
              class="streetview-dialog-preview"
            >
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeStreetViewDialog">Annuleren</v-btn>
          <v-btn
            v-if="!parsedPreview"
            color="primary"
            variant="flat"
            :loading="isParsing"
            :disabled="!streetViewUrl.trim() || isParsing"
            @click="fetchStreetViewPreview"
          >
            Ophalen
          </v-btn>
          <v-btn
            v-else
            color="primary"
            variant="flat"
            @click="insertStreetView"
          >
            Invoegen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import { imageCompressor } from "quill-image-compress";
import {
  ensureStreetViewEmbedBlotRegistered,
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
  placeholder: "Schrijf een reactie...",
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

const { token } = useAuth();
const { isConnected } = useConnectionStatus();

const authHeaders = computed(() => {
  if (!token.value) return undefined;
  const cleanToken = token.value.replace(/^Bearer\s+/i, "");
  return { Authorization: `Bearer ${cleanToken}` };
});

const quillEditorRef = ref<InstanceType<typeof QuillEditor> | null>(null);
const errorMessage = ref("");

const modules = [
  {
    name: "compress",
    module: imageCompressor,
    options: {
      quality: 0.7,
      maxWidth: 1000,
      maxHeight: 1000,
      imageType: "image/jpeg",
      debug: true,
      suppressErrorLogging: false,
      handleOnPaste: true,
      insertIntoEditor: undefined,
    },
  },
];

const toolbar = [
  [{ header: [2, 3, 4, false] }],
  ["bold", "italic"],
  ["link", "image"],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [{ indent: "-1" }, { indent: "+1" }],
];

function isContentEmpty(val?: string | null): boolean {
  if (!val) return true;
  const text = val
    .replace(/<p><br><\/p>/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
  if (text.length > 0) return false;
  if (val.includes("<img") || val.includes("streetview-embed")) return false;
  return true;
}

const canSubmit = computed(() => {
  return !isContentEmpty(content.value) && isConnected.value && !props.loading;
});

// Street View dialog logic
const showStreetViewDialog = ref(false);
const streetViewUrl = ref("");
const isParsing = ref(false);
const parseError = ref("");
const parsedPreview = ref<StreetViewEmbedValue | null>(null);

function openStreetViewDialog() {
  streetViewUrl.value = "";
  parseError.value = "";
  parsedPreview.value = null;
  showStreetViewDialog.value = true;
}

function closeStreetViewDialog() {
  showStreetViewDialog.value = false;
}

async function fetchStreetViewPreview() {
  const url = streetViewUrl.value.trim();
  if (!url || isParsing.value) return;

  isParsing.value = true;
  parseError.value = "";
  try {
    parsedPreview.value = await $fetch<StreetViewEmbedValue>(
      "/api/streetview/parse",
      {
        method: "POST",
        body: { url },
        headers: authHeaders.value,
      },
    );
  } catch (error) {
    parsedPreview.value = null;
    const fetchError = error as { data?: { message?: string } };
    parseError.value =
      fetchError?.data?.message ?? "Kon de Street View link niet verwerken";
  } finally {
    isParsing.value = false;
  }
}

async function insertStreetView() {
  const preview = parsedPreview.value;
  if (!preview) return;

  await ensureStreetViewEmbedBlotRegistered();
  const quill = quillEditorRef.value?.getQuill();
  if (quill) {
    const range = quill.getSelection(true) ?? {
      index: quill.getLength(),
      length: 0,
    };
    quill.insertEmbed(range.index, "streetviewEmbed", preview, "user");
    quill.setSelection(range.index + 1, 0, "user");
  } else {
    const code =
      `<div class="streetview-embed" data-lat="${preview.lat}" ` +
      `data-lng="${preview.lng}" data-heading="${preview.heading}" ` +
      `data-pitch="${preview.pitch}" data-fov="${preview.fov}" ` +
      `data-pano-id="${preview.panoId}" data-embed-src="${preview.embedSrc}">` +
      `<img src="${preview.previewDataUrl}" alt="Street View voorvertoning" /></div>`;
    content.value = `${content.value ?? ""}${code}`;
  }

  showStreetViewDialog.value = false;
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

.streetview-dialog-preview {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
}
</style>

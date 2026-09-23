<template>
  <v-dialog v-model="isOpen" max-width="800">
    <v-card v-if="entry">
      <v-card-title>{{ entry.key }}</v-card-title>
      <v-card-text>
        <v-textarea
          v-if="entry.text_type !== 'rich'"
          v-model="editorText"
          :label="entry.text_type === 'url' ? 'URL' : 'Tekst'"
          rows="4"
          auto-grow
        />
        <div v-else class="text-editor-container">
          <QuillEditor
            v-if="isOpen"
            :key="entry.key"
            v-model:content="editorText"
            content-type="html"
            :toolbar
            class="text-editor"
          />
        </div>
        <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="isSaving" @click="isOpen = false">
          Annuleren
        </v-btn>
        <v-btn color="primary" variant="flat" :loading="isSaving" @click="save">
          Opslaan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import type { TextEntry } from "~/types/Text";

const props = defineProps<{
  entry: TextEntry | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const isOpen = defineModel<boolean>({ required: true });
const editorText = ref("");
const error = ref("");
const isSaving = ref(false);
const { updateText } = useTexts();

const toolbar = [
  [{ header: [1, 2, 3, 4, false] }],
  ["bold", "italic"],
  ["link", "image"],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ indent: "-1" }, { indent: "+1" }],
];

watch(
  () => [isOpen.value, props.entry] as const,
  ([open, entry]) => {
    if (open && entry) {
      editorText.value = entry.text;
      error.value = "";
    }
  },
  { immediate: true },
);

async function save() {
  if (!props.entry) {
    return;
  }

  isSaving.value = true;
  error.value = "";
  try {
    await updateText(props.entry.key, editorText.value);
    emit("saved");
    isOpen.value = false;
  } catch {
    error.value = "De tekst kon niet worden opgeslagen.";
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.text-editor {
  height: 278px;
}

.text-editor-container {
  height: 320px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

:deep(.ql-container) {
  height: calc(100% - 42px) !important;
}
</style>

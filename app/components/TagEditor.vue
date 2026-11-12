<template>
  <!-- Create/Edit Dialog -->
  <v-dialog
    v-model="isDialogOpen"
    max-width="700px"
    @update:model-value="handleDialogClose"
  >
    <v-card>
      <v-card-title>
        {{ isEditing ? "Tag bewerken" : "Nieuwe tag" }}
      </v-card-title>

      <v-card-text>
        <v-form v-model="valid">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.label"
                label="Label"
                hint="Gebruikersvriendelijke naam"
                persistent-hint
                :rules="[requiredRule]"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.tag"
                label="Slug / key"
                :disabled="true"
                hint="Wordt automatisch genormaliseerd"
                persistent-hint
              />
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-2">Icoon</div>
              <div class="d-flex align-center ga-2">
                <AppIcon
                  :icon="form.icon || 'mdi-tag-outline'"
                  size="24"
                  color="grey"
                />
                <span class="text-caption text-medium-emphasis">
                  {{ form.icon || "Geen icoon" }}
                </span>
              </div>
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-2">Omschrijving</div>
              <RichTextEditor
                ref="richTextEditorRef"
                v-model="form.description"
              />
            </v-col>

            <v-col cols="12">
              <IconSelector v-model="form.icon" :preview-color="'#808080'" />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="!valid"
          @click="handleSave"
        >
          Opslaan
        </v-btn>
        <v-btn variant="text" @click="handleCancel">Annuleren</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Tag } from "~~/shared/types/Tag";
import type { SanitizedHTML } from "~~/shared/types/SanitizedHTML";
import type RichTextEditor from "./RichTextEditor.vue";

type TagForm = {
  tag: string;
  label: string;
  description: SanitizedHTML;
  icon?: string;
};

const { create, update } = useTagsApi();

// Dialog state
const isDialogOpen = defineModel("open", { type: Boolean, default: false });

// Form state
const form = ref<TagForm>({
  tag: "",
  label: "",
  description: "" as SanitizedHTML,
  icon: undefined,
});
const valid = ref(false);
const saving = ref(false);
const richTextEditorRef = ref<InstanceType<typeof RichTextEditor> | null>(null);

// Edit state
const isEditing = ref(false);
const editingTagId = ref<number | null>(null);

// Watch label changes and auto-generate tag
watch(
  () => form.value.label,
  (label) => {
    form.value.tag = normalizeSlug(label);
  },
);

// Public methods for parent component
function openCreateDialog() {
  isEditing.value = false;
  editingTagId.value = null;
  form.value = {
    tag: "",
    label: "",
    description: "" as SanitizedHTML,
    icon: undefined,
  };
  isDialogOpen.value = true;
}

function openEditDialog(tag: Tag) {
  isEditing.value = true;
  editingTagId.value = tag.id;
  form.value = {
    tag: tag.tag,
    label: tag.label ?? tag.tag,
    description: tag.description ?? ("" as SanitizedHTML),
    icon: tag.icon ?? undefined,
  };
  isDialogOpen.value = true;
}

// Event handlers
async function handleSave() {
  // Sanitize the description before saving
  if (richTextEditorRef.value) {
    richTextEditorRef.value.sanitize();
  }

  const tagValue = normalizeSlug(form.value.tag || "");
  if (!tagValue) return;

  saving.value = true;

  try {
    const payload = {
      tag: tagValue,
      label: form.value.label.trim() || form.value.tag.trim() || tagValue,
      description: form.value.description.trim() || null,
      icon: form.value.icon?.trim() || null,
    };

    if (isEditing.value && editingTagId.value !== null) {
      await update(editingTagId.value, payload);
    } else {
      await create(payload);
    }

    emit("saved");
    handleCancel();
  } catch (error) {
    console.error("Failed to save tag:", error);
    useSnackbar().showError("Tag kon niet worden opgeslagen");
  } finally {
    saving.value = false;
  }
}

function handleCancel() {
  isDialogOpen.value = false;
  form.value = {
    tag: "",
    label: "",
    description: "" as SanitizedHTML,
    icon: undefined,
  };
  editingTagId.value = null;
  isEditing.value = false;
}

function handleDialogClose() {
  if (!isDialogOpen.value) {
    handleCancel();
  }
}

// Expose methods for parent
defineExpose({
  openCreateDialog,
  openEditDialog,
});

// Emit events
const emit = defineEmits<{
  saved: [];
}>();
</script>

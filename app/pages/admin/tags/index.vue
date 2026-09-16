<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <span>Tags</span>
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
        >
          Nieuwe tag
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="tags"
          item-value="tag"
          density="compact"
          :items-per-page="10"
          :items-per-page-options="[5, 10, 25, 50]"
        >
          <template #item.tag="{ item }">
            <div class="d-flex align-center ga-2">
              <v-icon
                :icon="item.icon || 'mdi-tag-outline'"
                size="18"
                color="grey"
              />
              <span>{{ item.tag }}</span>
            </div>
          </template>

          <template #item.description="{ item }">
            <span class="text-medium-emphasis">
              {{ item.description || "-" }}
            </span>
          </template>

          <template #item.icon="{ item }">
            <v-chip
              v-if="item.icon"
              color="grey"
              variant="tonal"
              size="small"
              prepend-icon="mdi-tag"
            >
              {{ item.icon }}
            </v-chip>
            <span v-else class="text-medium-emphasis">-</span>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex ga-2">
              <v-btn
                icon="mdi-pencil"
                variant="text"
                color="primary"
                size="small"
                @click="openEditDialog(item)"
              />
              <v-btn
                icon="mdi-delete"
                variant="text"
                color="error"
                size="small"
                @click="confirmDelete(item)"
              />
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog" max-width="700px">
      <v-card>
        <v-card-title>
          {{ isEditing ? "Tag bewerken" : "Nieuwe tag" }}
        </v-card-title>

        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.label"
                label="Label"
                hint="Gebruikersvriendelijke naam"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.tag"
                label="Slug / key"
                :disabled="isEditing"
                hint="Wordt automatisch genormaliseerd"
                persistent-hint
              />
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-2">Icoon</div>
              <div class="d-flex align-center ga-2">
                <v-icon
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
              <v-textarea
                v-model="form.description"
                label="Omschrijving"
                rows="3"
                auto-grow
              />
            </v-col>

            <v-col cols="12">
              <IconSelector v-model="form.icon" :preview-color="'#808080'" />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="saveTag" :loading="saving">
            Opslaan
          </v-btn>
          <v-btn variant="text" @click="dialog = false">Annuleren</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420px">
      <v-card>
        <v-card-title>Tag verwijderen</v-card-title>
        <v-card-text>
          Weet je zeker dat je de tag "{{ selectedTagToDelete?.tag }}" wilt
          verwijderen?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="error" @click="deleteTag" :loading="saving">
            Verwijderen
          </v-btn>
          <v-btn @click="deleteDialog = false">Annuleren</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from "~~/shared/types/Tag";

useTitle("Tag beheer");

definePageMeta({
  middleware: [
    "sidebase-auth",
    function () {
      const { isAdmin } = useRoles();
      return isAdmin.value || "/admin";
    },
  ],
});

type TagForm = {
  tag: string;
  label: string;
  description: string;
  icon?: string;
};

const headers = [
  { title: "Label", value: "label", sortable: true },
  { title: "Slug", value: "tag", sortable: true },
  { title: "Omschrijving", value: "description", sortable: false },
  { title: "Icoon", value: "icon", sortable: false },
  { title: "Acties", value: "actions", sortable: false },
];

const { tags, create, update, remove } = useTagsApi();

const dialog = ref(false);
const deleteDialog = ref(false);
const saving = ref(false);
const selectedTagToDelete = ref<Tag | null>(null);
const isEditing = ref(false);
const form = ref<TagForm>({
  tag: "",
  label: "",
  description: "",
  icon: undefined,
});

function openCreateDialog() {
  isEditing.value = false;
  form.value = { tag: "", label: "", description: "", icon: undefined };
  dialog.value = true;
}

function openEditDialog(item: Tag) {
  isEditing.value = true;
  form.value = {
    tag: item.tag,
    label: item.label ?? item.tag,
    description: item.description ?? "",
    icon: item.icon ?? undefined,
  };
  dialog.value = true;
}

function confirmDelete(item: Tag) {
  selectedTagToDelete.value = item;
  deleteDialog.value = true;
}

function normalizeTagValue(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

async function saveTag() {
  const tagValue = normalizeTagValue(form.value.tag || "");
  if (!tagValue) return;

  saving.value = true;

  try {
    const payload = {
      tag: tagValue,
      label: form.value.label.trim() || form.value.tag.trim() || tagValue,
      description: form.value.description.trim() || null,
      icon: form.value.icon?.trim() || null,
    };

    if (isEditing.value) {
      const updated = await update(tagValue, payload);
      if (tags.value) {
        tags.value = tags.value.map((item) =>
          item.tag === updated.tag ? updated : item,
        );
      }
    } else {
      const created = await create(payload);
      if (tags.value) {
        tags.value = [...tags.value, created];
      }
    }

    dialog.value = false;
    form.value = { tag: "", label: "", description: "", icon: undefined };
  } catch (error) {
    console.error("Failed to save tag:", error);
    useSnackbar().showError("Tag kon niet worden opgeslagen");
  } finally {
    saving.value = false;
  }
}

async function deleteTag() {
  if (!selectedTagToDelete.value) return;

  saving.value = true;

  try {
    await remove(selectedTagToDelete.value.tag);
    if (tags.value) {
      tags.value = tags.value.filter(
        (item) => item.tag !== selectedTagToDelete.value?.tag,
      );
    }
    deleteDialog.value = false;
    selectedTagToDelete.value = null;
  } catch (error) {
    console.error("Failed to delete tag:", error);
    useSnackbar().showError("Tag kon niet worden verwijderd");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <span>Tags</span>
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="editorRef?.openCreateDialog()"
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
          <template #[`item.tag`]="{ item }">
            <div class="d-flex align-center ga-2">
              <AppIcon
                :icon="item.icon || 'mdi-tag-outline'"
                size="18"
                color="grey"
              />
              <span>{{ item.tag }}</span>
            </div>
          </template>

          <template #[`item.description`]="{ item }">
            <div v-if="item.description" class="description-preview">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="removeLineBreaks(item.description)" />
            </div>
            <span v-else class="text-medium-emphasis">-</span>
          </template>

          <template #[`item.icon`]="{ item }">
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

          <template #[`item.actions`]="{ item }">
            <div class="d-flex ga-2">
              <v-btn
                icon="mdi-pencil"
                variant="text"
                color="primary"
                size="small"
                :aria-label="`${item.tag} bewerken`"
                @click="editorRef?.openEditDialog(item)"
              />
              <v-btn
                icon="mdi-delete"
                variant="text"
                color="error"
                :aria-label="`${item.tag} verwijderen`"
                size="small"
                @click="confirmDelete(item)"
              />
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <TagEditor ref="editorRef" v-model:open="editorOpen" @saved="handleSaved" />

    <v-dialog v-model="deleteDialog" max-width="420px">
      <v-card>
        <v-card-title>Tag verwijderen</v-card-title>
        <v-card-text>
          Weet je zeker dat je de tag "{{ selectedTagToDelete?.tag }}" wilt
          verwijderen?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="error" :loading="saving" @click="handleDelete">
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
import { removeLineBreaks } from "~~/shared/utils/getPlainText";

useTitle("Tag beheer");

definePageMeta({
  middleware: ["sidebase-auth"],
});

const headers = [
  { title: "Label", value: "label", sortable: true },
  { title: "Slug", value: "tag", sortable: true },
  { title: "Omschrijving", value: "description", sortable: false },
  { title: "Acties", value: "actions", sortable: false },
];

const { tags, remove, refreshTags } = useTagsApi();
const editorRef = ref();
const editorOpen = ref(false);
const deleteDialog = ref(false);
const saving = ref(false);
const selectedTagToDelete = ref<Tag | null>(null);

function confirmDelete(item: Tag) {
  selectedTagToDelete.value = item;
  deleteDialog.value = true;
}

async function handleDelete() {
  if (!selectedTagToDelete.value) return;

  saving.value = true;

  try {
    await remove(selectedTagToDelete.value.id);
    if (tags.value) {
      tags.value = tags.value.filter(
        (item: Tag) => item.id !== selectedTagToDelete.value?.id,
      );
    }
    deleteDialog.value = false;
    selectedTagToDelete.value = null;
  } catch (error) {
    console.error("Failed to delete tag:", error);
    useSnackbar().showError("Tag kon niet worden verwijderd");
  } finally {
    saving.value = false;
    await refreshTags();
  }
}

async function handleSaved() {
  // TagEditor handles UI updates internally
}
</script>

<style scoped>
.description-preview {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  word-wrap: break-word;
}

.description-preview h2,
.description-preview h3,
.description-preview h4,
.description-preview b,
.description-preview i,
.description-preview strong,
.description-preview em {
  display: inline;
}
</style>

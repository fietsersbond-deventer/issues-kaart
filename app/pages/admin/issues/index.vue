<!-- eslint-disable vue/valid-v-slot -->
<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center" style="gap: 16px">
        <v-text-field
          v-model="search"
          label="Zoek"
          dense
          hide-details
          clearable
        />
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="filteredIssues"
          item-value="id"
          class="elevation-1"
          density="compact"
          :loading="!issues.length"
        >
          <template #item.title="{ item }">
            <v-text-field
              v-model="item.title"
              dense
              hide-details
              @change="updateIssue(item)"
            />
          </template>

          <template #item.legend_name="{ item }">
            <CategorySelect
              v-if="availableLegends"
              v-model="item.legend_id"
              :legends="availableLegends"
              @update:model-value="updateIssue(item)"
            />
          </template>

          <template #item.created_at="{ item }">
            {{
              new Date(item.created_at).toLocaleDateString("nl-NL", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            }}
          </template>

          <template #item.actions="{ item }">
            <div v-if="editingUsers[item.id]">
              <span>{{ editingUsers[item.id] }} is bezig met bewerken</span>
            </div>
            <div v-else>
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                @click="() => notifyEditing(item.id, true)"
              >
                <v-icon>mdi-pencil</v-icon>
                <v-tooltip activator="parent" location="top">
                  Bewerken
                </v-tooltip>
              </v-btn>
              <v-btn
                icon="mdi-delete"
                variant="text"
                color="error"
                size="small"
                @click="confirmDelete(item)"
              >
                <v-icon>mdi-delete</v-icon>
                <v-tooltip activator="parent" location="top">
                  Verwijder issue
                </v-tooltip>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400px">
      <v-card>
        <v-card-title>Issue verwijderen</v-card-title>
        <v-card-text>
          Weet je zeker dat je issue "{{ deleteIssue?.title }}" wilt
          verwijderen?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :loading="loading" color="error" @click="deleteUserConfirmed">
            Verwijderen
          </v-btn>
          <v-btn @click="showDeleteDialog = false">Annuleren</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { isExistingIssue, type Issue } from "~/types/Issue";
import type { Legend } from "~/types/Legend";
import { ref, watch } from "vue";
import { useIssueLocks } from "~/composables/useIssueLocks";

definePageMeta({
  title: "Gebruikers",
});

const issuesStore = useIssues();
const { remove, update } = issuesStore;
const { issues } = storeToRefs(issuesStore);
const showDeleteDialog = ref(false);
const loading = ref(false);
const deleteIssue = ref<Issue | null>(null);
const snackbar = useSnackbar();
const { data: availableLegends } = useFetch<Legend[]>("/api/legends");

const existingIssues = computed(
  () => issues.value.filter((issue) => isExistingIssue(issue)) || []
);

const search = ref("");

const filteredIssues = computed(() => {
  return existingIssues.value.filter(
    (issue) =>
      !search.value ||
      issue.title.toLowerCase().includes(search.value.toLowerCase()) ||
      issue.legend_name?.toLowerCase().includes(search.value.toLowerCase())
  );
});

const headers = [
  { title: "Titel", value: "title", sortable: true, width: "50%" },
  { title: "Categorie", value: "legend_name", sortable: true },
  { title: "Datum", value: "created_at", sortable: true },
  { title: "Acties", value: "actions", sortable: false },
];

function confirmDelete(issue: Issue) {
  deleteIssue.value = issue;
  showDeleteDialog.value = true;
}

async function deleteUserConfirmed() {
  if (!deleteIssue.value || !isExistingIssue(deleteIssue.value)) return;

  loading.value = true;
  try {
    await remove(deleteIssue.value.id);
    showDeleteDialog.value = false;
    snackbar.showSuccess(`Issue "${deleteIssue.value.title}" is verwijderd!`);
    deleteIssue.value = null;
  } catch (error) {
    console.error("Error deleting user:", error);
    snackbar.showError(
      "Er is een fout opgetreden bij het verwijderen van het issue."
    );
  } finally {
    loading.value = false;
  }
}

async function updateIssue(issue: Issue) {
  if (!isExistingIssue(issue)) return;

  try {
    await update(issue.id, issue);
    snackbar.showSuccess(`Issue "${issue.title}" is bijgewerkt!`);
  } catch (error) {
    console.error("Error updating issue:", error);
    snackbar.showError(
      "Er is een fout opgetreden bij het bijwerken van het issue."
    );
  }
}

const { editingUsers, notifyEditing } = useIssueLocks();

watch(wsData, (data) => {
  if (data?.type === "editing-status") {
    editingUsers.value = data.payload;
  }
});
</script>

<style>
.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}
</style>

<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <span>Issues</span>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="existingIssues"
          item-value="id"
          class="elevation-1"
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
            <div class="d-flex align-center" style="gap: 8px">
              <div
                class="color-preview"
                :style="{ backgroundColor: item.color }"
              />
              <div>{{ item.legend_name || "Onbekend" }}</div>
            </div>
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
            <v-btn
              icon="mdi-delete"
              variant="text"
              color="error"
              size="small"
              @click="confirmDelete(item)"
            />
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

const existingIssues = computed(
  () => issues.value.filter((issue) => isExistingIssue(issue)) || []
);

const headers = [
  { title: "Titel", value: "title", sortable: true },
  { title: "Type", value: "legend_name", sortable: true },
  { title: "Datum", value: "created_at", sortable: true },
  { title: "Acties", value: "actions", sortable: false },
];

function confirmDelete(issue: Issue) {
  deleteIssue.value = issue;
  showDeleteDialog.value = true;
}

async function deleteUserConfirmed() {
  if (!deleteIssue.value) return;

  loading.value = true;
  try {
    await remove(deleteIssue.value.id);
    showDeleteDialog.value = false;
    deleteIssue.value = null;
  } catch (error) {
    console.error("Error deleting user:", error);
  } finally {
    loading.value = false;
  }
}

async function updateIssue(issue: Issue) {
  try {
    await update(issue.id, { title: issue.title });
    snackbar.showSuccess(`Issue "${issue.title}" is bijgewerkt!`);
  } catch (error) {
    console.error("Error updating issue:", error);
    snackbar.showError("Er is een fout opgetreden bij het bijwerken van het issue.");
  }
}
</script>

<style>
.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
</style>

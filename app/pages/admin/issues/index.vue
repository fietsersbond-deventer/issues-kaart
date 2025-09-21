<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <span>Issues</span>
      </v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Kleur</th>
              <th>Status</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="issue in issues" :key="issue.id">
              <td>{{ issue.title }}</td>
              <td>
                <div
                  class="color-preview"
                  :style="{ backgroundColor: issue.color }"
                />
              </td>

              <td>{{ issue.legend_name }}</td>
              <td>
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  color="error"
                  size="small"
                  @click="confirmDelete(issue)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
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
import type { Issue } from "~/types/Issue";
import type { User } from "~/types/User";

definePageMeta({
  title: "Gebruikers",
});

const { issues, update, remove } = useIssues();
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const loading = ref(false);
const deleteIssue = ref<Issue | null>(null);

const runtimeConfig = useRuntimeConfig();
const { showSuccess, showError } = useSnackbar();

function editUser(user: User) {
  editedUser.value = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
  showEditDialog.value = true;
}

async function updateUser(data: {
  username: string;
  name: string | null;
  role: string;
}) {
  if (!editedUser.value) return;

  loading.value = true;
  try {
    await update(editedUser.value.id, data);
    showEditDialog.value = false;
    editedUser.value = null;
  } catch (error) {
    console.error("Error updating user:", error);
  } finally {
    loading.value = false;
  }
}

function confirmDelete(issue: { id: number; title: string }) {
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
</script>

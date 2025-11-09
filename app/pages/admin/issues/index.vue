<!-- eslint-disable vue/valid-v-slot -->
<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center" style="gap: 16px">
        <v-text-field
          v-model="state.search"
          label="Zoek"
          dense
          hide-details
          clearable
        />
      </v-card-title>
      <v-card-text>
        <v-data-table
          v-model:page="state.page"
          v-model:items-per-page="state.itemsPerPage"
          v-model:sort-by="state.sortBy"
          :headers="headers"
          :items="filteredIssues"
          item-value="id"
          class="elevation-1"
          density="compact"
          :loading="!issues.length"
          :row-props="lockRow"
          :items-per-page-options="[5, 10, 25, 50]"
          show-current-page
        >
          <template #item.title="{ item }">
            <div>
              <v-text-field
                v-model="item.title"
                dense
                hide-details
                :disabled="!!locks[item.id]"
                @change="updateIssue(item)"
                @focus="notifyEditing(item.id, true)"
                @blur="notifyEditing(item.id, false)"
              />
            </div>
          </template>

          <template #item.legend_name="{ item }">
            <div>
              <CategorySelect
                v-if="availableLegends"
                v-model="item.legend_id"
                :legends="availableLegends"
                :disabled="!!locks[item.id]"
                @update:model-value="updateIssue(item)"
                @focus="notifyEditing(item.id, true)"
                @blur="notifyEditing(item.id, false)"
              />
            </div>
          </template>

          <template #item.created_at="{ item }">
            <div>
              {{
                new Date(item.created_at).toLocaleDateString("nl-NL", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
              }}
            </div>
          </template>

          <template #item.actions="{ item }">
            <div>
              <template v-if="locks[item.id]">
                <div
                  class="d-flex align-center justify-center lock-icon-container"
                  style="width: 40px; height: 40px"
                >
                  <v-icon color="warning" icon="mdi-lock" />
                  <v-tooltip activator="parent" location="top">
                    {{ locks[item.id] }}
                  </v-tooltip>
                </div>
                <v-btn
                  :to="`/kaart/${item.id}`"
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  class="lock-icon-container"
                >
                  <v-icon>mdi-arrow-right</v-icon>
                  <v-tooltip activator="parent" location="top">
                    Bekijk issue in de kaart
                  </v-tooltip>
                </v-btn>
              </template>
              <template v-else>
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  color="error"
                  size="small"
                  @click.stop="confirmDelete(item)"
                >
                  <v-icon>mdi-delete</v-icon>
                  <v-tooltip activator="parent" location="top">
                    Verwijder issue
                  </v-tooltip>
                </v-btn>
                <v-btn
                  :to="`/kaart/${item.id}`"
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click.stop
                >
                  <v-icon>mdi-arrow-right</v-icon>
                  <v-tooltip activator="parent" location="top">
                    Bekijk issue in de kaart
                  </v-tooltip>
                </v-btn>
              </template>
            </div>
          </template></v-data-table
        >
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
import type { AdminListIssue } from "@/types/Issue";
import type { Legend } from "~/types/Legend";

const pageTitle = "Onderwerpen";

definePageMeta({
  title: pageTitle,
  middleware: ["sidebase-auth"],
});

// Set browser tab title
useHead({
  title: `${pageTitle} - Fietsersbond Deventer`,
});

// Use lightweight issues for admin list (only id, title, legend_id, created_at)
const issuesStore = useIssues({
  fields: "id,title,legend_id,created_at",
});
const { remove } = issuesStore;
const { issues } = storeToRefs(issuesStore);

const locksStore = useIssueLocks();
const { notifyEditing } = locksStore;
const { locks } = storeToRefs(locksStore);

const showDeleteDialog = ref(false);
const loading = ref(false);
const deleteIssue = ref<AdminListIssue | null>(null);
const snackbar = useSnackbar();
const { data: availableLegends } = useFetch<Legend[]>("/api/legends");

const existingIssues = computed(() => issues.value || []);

// Persistent state management using Nuxt's useState
const state = useState("admin-issues-state", () => ({
  search: "",
  page: 1,
  itemsPerPage: 10,
  sortBy: [{ key: "created_at", order: "desc" }] as {
    key: string;
    order: "asc" | "desc";
  }[],
}));

// Reset pagination when search changes
watch(
  () => state.value.search,
  (newSearch, oldSearch) => {
    if (newSearch !== oldSearch) {
      state.value.page = 1;
    }
  }
);

const filteredIssues = computed(() => {
  return existingIssues.value.filter(
    (issue) =>
      !state.value.search ||
      issue.title.toLowerCase().includes(state.value.search.toLowerCase()) ||
      issue.legend.name
        ?.toLowerCase()
        .includes(state.value.search.toLowerCase())
  );
});

const headers = [
  { title: "Titel", value: "title", sortable: true, width: "50%" },
  { title: "Categorie", value: "legend_name", sortable: true },
  { title: "Datum", value: "created_at", sortable: true },
  { title: "Acties", value: "actions", sortable: false },
];

function lockRow(data: { item: AdminListIssue }) {
  return {
    class: {
      "locked-row": !!locks.value[data.item.id],
    },
  };
}

function confirmDelete(issue: AdminListIssue) {
  deleteIssue.value = issue;
  showDeleteDialog.value = true;
}

async function deleteUserConfirmed() {
  if (!deleteIssue.value) return;

  loading.value = true;
  try {
    await remove(deleteIssue.value.id);
    showDeleteDialog.value = false;
    snackbar.showSuccess(
      `Onderwerp "${deleteIssue.value.title}" is verwijderd!`
    );
    deleteIssue.value = null;
  } catch (error) {
    console.error("Error deleting issue:", error);
    snackbar.showError(
      "Er is een fout opgetreden bij het verwijderen van het onderwerp."
    );
  } finally {
    loading.value = false;
  }
}

async function updateIssue(issue: AdminListIssue) {
  try {
    await update(issue.id, issue);
    snackbar.showSuccess(`Onderwerp "${issue.title}" is bijgewerkt`);
  } catch (error) {
    console.error("Error updating issue:", error);
    snackbar.showError(
      "Er is een fout opgetreden bij het bijwerken van het onderwerp."
    );
  }
}
</script>

<style>
.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

/* Make locked rows completely unclickable */
.locked-row {
  pointer-events: none !important;
  opacity: 0.6;
  user-select: none;
}

/* Re-enable pointer events only for allowed interactive elements */
.locked-row .lock-icon-container {
  pointer-events: auto !important;
}
</style>

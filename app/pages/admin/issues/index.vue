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
        <v-data-table-server
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          v-model:sort-by="sortBy"
          :headers="headers"
          :items="searchResult?.items"
          :items-length="searchResult?.total || 0"
          item-value="id"
          class="elevation-1"
          density="compact"
          :loading="loading"
          :row-props="lockRow"
          :items-per-page-options="[5, 10, 25, 50]"
          show-current-page
          @update:options="onDataTableUpdate"
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

          <template #item.snippet="{ item }">
            <div v-if="item.snippet" class="text-caption text-grey">
              {{ item.snippet }}
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
          </template></v-data-table-server
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
import { enrichAdminListItems } from "@/utils/enrichIssue";
import type { Legend } from "~/types/Legend";

// Type for enriched admin list items
type EnrichedAdminItem = {
  id: number;
  title: string;
  snippet?: string;
  legend_id: number | null;
  created_at: string;
  legend?: Legend;
};

definePageMeta({
  title: "Gebruikers",
  middleware: ["sidebase-auth"],
});

const { remove } = useIssuesMethods();

const locksStore = useIssueLocks();
const { notifyEditing } = locksStore;
const { locks } = storeToRefs(locksStore);

const showDeleteDialog = ref(false);
const deleteIssue = ref<EnrichedAdminItem | null>(null);
const snackbar = useSnackbar();
const { data: availableLegends } = useFetch<Legend[]>("/api/legends");

// Server-side data table state
const search = ref("");
const page = ref(1);
const itemsPerPage = ref(10);
const sortBy = ref<{ key: string; order: "asc" | "desc" }[]>([
  { key: "created_at", order: "desc" },
]);

const headers = [
  { title: "Titel", key: "title", sortable: true, width: "30%" },
  { title: "Match", key: "snippet", sortable: false, width: "40%" },
  { title: "Categorie", key: "legend_name", sortable: true },
  { title: "Datum", key: "created_at", sortable: true },
  { title: "Acties", key: "actions", sortable: false },
];

function lockRow(data: { item: EnrichedAdminItem }) {
  return {
    class: {
      "locked-row": !!locks.value[data.item.id],
    },
  };
}

// Fetch data from server using useAsyncData with enrichment
const {
  data: searchResult,
  pending: loading,
  refresh,
} = useAsyncData(
  () => {
    const sortColumn = sortBy.value[0]?.key || "created_at";
    const sortOrder = sortBy.value[0]?.order || "desc";

    return $fetch("/api/admin/issues/search", {
      query: {
        search: search.value,
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortColumn,
        sortOrder: sortOrder,
      },
    });
  },
  {
    watch: [search, page, itemsPerPage, sortBy, availableLegends],
    transform: (result) => ({
      ...result,
      items: enrichAdminListItems(result.items, availableLegends.value),
    }),
  }
);

// Handle data table changes
function onDataTableUpdate(options: {
  page: number;
  itemsPerPage: number;
  sortBy: { key: string; order: "asc" | "desc" }[];
}) {
  page.value = options.page;
  itemsPerPage.value = options.itemsPerPage;
  sortBy.value = options.sortBy;
}

// Reset page when searching
watch(search, () => {
  page.value = 1;
});

function confirmDelete(issue: EnrichedAdminItem) {
  deleteIssue.value = issue;
  showDeleteDialog.value = true;
}

async function deleteUserConfirmed() {
  if (!deleteIssue.value) return;

  try {
    await remove(deleteIssue.value.id);
    showDeleteDialog.value = false;
    snackbar.showSuccess(
      `Onderwerp "${deleteIssue.value.title}" is verwijderd!`
    );
    deleteIssue.value = null;
    await refresh(); // Reload the table
  } catch (error) {
    console.error("Error deleting issue:", error);
    snackbar.showError(
      "Er is een fout opgetreden bij het verwijderen van het onderwerp."
    );
  }
}

async function updateIssue(item: EnrichedAdminItem) {
  try {
    // Send partial update with only the fields we changed
    await $fetch(`/api/issues/${item.id}`, {
      method: "PATCH",
      body: {
        title: item.title,
        legend_id: item.legend_id,
      },
    });
    snackbar.showSuccess(`Onderwerp "${item.title}" is bijgewerkt`);
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

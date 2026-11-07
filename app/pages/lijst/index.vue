<!-- eslint-disable vue/valid-v-slot -->
<template>
  <div>
    <v-card class="mb-4">
      <v-card-title v-if="!isPrinting" class="d-flex align-center" style="gap: 16px">
        <v-text-field v-model="state.search" label="Zoek" dense hide-details clearable />
      </v-card-title>
      <v-card-text>
        <v-data-table-server
          v-model:page="state.page"
          v-model:sort-by="state.sortBy"
          v-model:items-per-page="state.itemsPerPage"
          :headers="headers"
          :items="issues"
          :items-length="totalItems"
          item-value="id"
          class="elevation-1"
          density="compact"
          :loading="pending"
          :items-per-page-options="[5, 10, 25, 50]"
          show-current-page
          @click:row="gotoIssue"
        >
          <template #item.imageUrl="{ item }">
            <NuxtLink :to="issueURL(item)">
              <v-img
                v-if="item.imageUrl"
                :src="thumbnailUrl(item.imageUrl)"
                class="thumbnail"
                :height="100"
                width="fit-content"
              >
                <template #placeholder>
                  <div class="d-flex align-center justify-center fill-height">
                    <v-progress-circular
                      color="grey-lighten-4"
                      indeterminate
                    ></v-progress-circular>
                  </div>
                </template>
              </v-img>
            </NuxtLink>
          </template>

          <template #item.legend="{ item }">
            <NuxtLink :to="issueURL(item)">
              <div class="legend-grid">
                <category-chip v-if="item.legend" :legend="item.legend" />
                <Tag v-for="tag in item.tags" :key="tag" :tag="getTag(tag)" />
              </div>
            </NuxtLink>
          </template>

          <!-- emphasizeFilter escapes all result text before adding mark tags. -->
          <!-- eslint-disable vue/no-v-html -->
          <template #item.title="{ item }">
            <NuxtLink :to="issueURL(item)">
              <template v-if="item.snippets?.length">
                <b v-html="emphasizeFilter(item.title)" />
                <div
                  v-for="snippet in item.snippets"
                  :key="snippet"
                  v-html="emphasizeFilter(snippet)"
                />
              </template>
              <template v-else>
                <span v-html="emphasizeFilter(item.title)" />
              </template>
            </NuxtLink>
          </template>

          <!-- eslint-enable vue/no-v-html -->
          <template #item.actions="{ item }">
            <div class="issue-actions">
              <v-btn
                v-if="item.editAvailability.status === 'disconnected'"
                icon
                variant="text"
                color="error"
                size="small"
                disabled
                :aria-label="`${item.title}: verbinding verbroken`"
              >
                <v-icon>mdi-wifi-off</v-icon>
                <v-tooltip activator="parent" location="top">
                  Verbinding verbroken - bewerken en verwijderen is niet mogelijk
                </v-tooltip>
              </v-btn>
              <v-btn
                v-else-if="item.editAvailability.status === 'locked'"
                icon
                variant="text"
                color="warning"
                size="small"
                :aria-label="`${item.title} bewerkt door ${item.editAvailability.lockedBy}`"
                @click.stop
              >
                <v-icon>mdi-lock-outline</v-icon>
                <v-tooltip activator="parent" location="top">
                  Dit issue wordt momenteel bewerkt door {{ item.editAvailability.lockedBy }}
                </v-tooltip>
              </v-btn>
              <span v-if="item.editAvailability.status !== 'available'" aria-hidden="true" />
              <template v-else>
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  color="primary"
                  size="small"
                  :aria-label="`${item.title} bewerken`"
                  @click.stop="openEditDialog(item)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  color="error"
                  size="small"
                  :aria-label="`${item.title} verwijderen`"
                  @click.stop="confirmDelete(item)"
                />
              </template>
              <v-btn
                icon="mdi-information-outline"
                variant="text"
                size="small"
                :aria-label="`Informatie over ${item.title}`"
                @click.stop="showIssueInfo(item)"
              />
            </div>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <v-dialog v-model="editDialog" max-width="800px" scrollable>
      <v-card v-if="issueToEdit" :loading="loadingEdit">
        <EditForm
          :key="issueToEdit.id"
          v-model="issueToEdit"
          v-model:dialog="editDialog"
          :navigate-on-slug-change="false"
          @save="handleEditSaved"
          @cancel="editDialog = false"
        />
      </v-card>
      <v-card v-else-if="loadingEdit">
        <v-card-text class="d-flex justify-center pa-8">
          <v-progress-circular indeterminate />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420px">
      <v-card>
        <v-card-title>Issue verwijderen</v-card-title>
        <v-card-text>
          Weet je zeker dat je "{{ issueToDelete?.title }}" wilt verwijderen?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="error"
            :loading="deleting"
            :disabled="!issueToDelete || issueLocks.getEditAvailability(issueToDelete.id).status !== 'available'"
            @click="deleteIssue"
          >
            Verwijderen
          </v-btn>
          <v-btn :disabled="deleting" @click="deleteDialog = false">
            Annuleren
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="infoDialog" max-width="420px">
      <v-card>
        <v-card-title>Laatst aangepast</v-card-title>
        <v-card-text>
          <v-progress-circular v-if="loadingInfo" indeterminate size="20" />
          <div v-else>{{ updatedByName || "Niet geregistreerd" }}</div>
          <div v-if="!loadingInfo" class="text-medium-emphasis">
            {{ formatUpdatedAt(updatedAt) }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="infoDialog = false">Sluiten</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery, refDebounced } from "@vueuse/core";
import CategoryChip from "~/components/CategoryChip.vue";
import { parseSearchTerms } from "~/utils/parseSearchTerms";
import { thumbnailUrl } from "~/utils/thumbnailUrl";
import type { Issue } from "~~/shared/types/Issue";
import type { Legend } from "~~/shared/types/Legend";

useTitle("Onderwerpen");

const { trackSiteSearch } = useMatomoTracking();
const isPrinting = useMediaQuery("print");
const { status } = useAuth();
const { getTag } = useTagsApi();
const issueLocks = useIssueLocks();
const {
  get: getIssue,
  getUpdatedBy,
  remove: removeIssue,
} = useIssuesMethods();
const { showError } = useSnackbar();

// Persistent state management using Nuxt's useState
const state = useState("issues-state", () => ({
  search: "",
  page: 1,
  itemsPerPage: 10,
  sortBy: [{ key: "created_at", order: "desc" }] as {
    key: string;
    order: "asc" | "desc";
  }[],
}));

type SearchIssue = {
  id: number;
  slug: string;
  title: string;
  legend_id: number;
  created_at: string;
  imageUrl: string | null;
  snippets: string[];
  legend?: Legend;
  tags: string[];
};

type SearchResponse = {
  items: SearchIssue[];
  total: number;
};

const headers = computed(() => {
  const columns = [
    { title: "", value: "imageUrl", sortable: false, minWidth: 150 },
    { title: "", value: "title", sortable: true },
    { title: "", value: "legend", sortable: false, width: "20em" },
  ];
  if (status.value === "authenticated") {
    columns.push({ title: "Acties", value: "actions", sortable: false, width: "140px" });
  }
  return columns;
});

const editDialog = ref(false);
const loadingEdit = ref(false);
const issueToEdit = ref<Issue | null>(null);
const activeEditLockId = ref<number | null>(null);
useIssueEditLock(
  computed(() => (editDialog.value ? activeEditLockId.value : null)),
);
const deleteDialog = ref(false);
const deleting = ref(false);
const issueToDelete = ref<SearchIssue | null>(null);
const infoDialog = ref(false);
const issueForInfo = ref<SearchIssue | null>(null);
const loadingInfo = ref(false);
const updatedByName = ref<string | null>(null);
const updatedAt = ref<string | null>(null);

async function openEditDialog(item: SearchIssue) {
  if (issueLocks.getEditAvailability(item.id).status !== "available") return;

  activeEditLockId.value = item.id;
  issueToEdit.value = null;
  editDialog.value = true;
  loadingEdit.value = true;
  try {
    const issue = await getIssue(item.id);
    if (activeEditLockId.value === item.id) {
      issueToEdit.value = issue;
    }
  } catch (error) {
    console.error("Failed to load issue for editing:", error);
    editDialog.value = false;
    activeEditLockId.value = null;
    showError("Issue kon niet worden geladen om te bewerken");
  } finally {
    loadingEdit.value = false;
  }
}

watch(editDialog, (isOpen) => {
  if (!isOpen) activeEditLockId.value = null;
});

function handleEditSaved() {
  editDialog.value = false;
  refreshResults();
}

function confirmDelete(item: SearchIssue) {
  if (issueLocks.getEditAvailability(item.id).status !== "available") return;
  issueToDelete.value = item;
  deleteDialog.value = true;
}

async function deleteIssue() {
  if (
    !issueToDelete.value ||
    issueLocks.getEditAvailability(issueToDelete.value.id).status !== "available"
  ) return;

  deleting.value = true;
  try {
    await removeIssue(issueToDelete.value.id);
    deleteDialog.value = false;
    issueToDelete.value = null;
    await refreshResults();
  } catch (error) {
    console.error("Failed to delete issue:", error);
    showError("Issue kon niet worden verwijderd");
  } finally {
    deleting.value = false;
  }
}

async function showIssueInfo(item: SearchIssue) {
  issueForInfo.value = item;
  updatedByName.value = null;
  updatedAt.value = null;
  infoDialog.value = true;
  loadingInfo.value = true;
  try {
    const result = await getUpdatedBy(item.id);
    if (issueForInfo.value?.id === item.id) {
      updatedByName.value = result.updated_by_name;
      updatedAt.value = result.updated_at;
    }
  } catch (error) {
    console.error("Failed to load issue update information:", error);
    infoDialog.value = false;
    showError("Informatie over het issue kon niet worden geladen");
  } finally {
    loadingInfo.value = false;
  }
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Datum niet geregistreerd";

  const timestamp = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(timestamp.getTime())) return "Datum niet geregistreerd";

  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

// Reset pagination when search changes
watch(
  () => state.value.search,
  (newSearch, oldSearch) => {
    if (newSearch !== oldSearch) {
      state.value.page = 1;
    }
  }
);

// Throttle outgoing search requests; dedupe:'cancel' aborts any request still in flight.
const debouncedSearch = refDebounced(
  computed(() => state.value.search ?? ""),
  300
);

const query = computed(() => ({
  page: state.value.page,
  itemsPerPage: state.value.itemsPerPage,
  orderBy: state.value.sortBy[0]?.key ?? "created_at",
  order: state.value.sortBy[0]?.order ?? "desc",
  search: debouncedSearch.value,
}));
const filters = computed(() =>
  parseSearchTerms(query.value.search).map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  )
);
const { emphasizeFilter } = useFilter(filters);
const {
  data: searchResponse,
  pending,
  refresh: refreshResults,
} = await useFetch<SearchResponse>("/api/issues/search", {
  query,
  dedupe: "cancel",
});

watch([debouncedSearch], () => {
  nextTick(() => {
    if (debouncedSearch.value) {
      trackSiteSearch(debouncedSearch.value, totalItems.value);
    }
  });
});

// Search results come from a separate endpoint, so invalidate them on persisted changes.
const ws = useSharedIssuesWebSocket();
const unsubscribe = ws.subscribe((message) => {
  if (["issue-created", "issue-modified", "issue-deleted"].includes(message.type)) {
    refreshResults();
  }
});
onUnmounted(unsubscribe);
let hasConnected = ws.status.value === "OPEN";
watch(ws.status, (state) => {
  if (state !== "OPEN") return;
  if (hasConnected) refreshResults();
  hasConnected = true;
});

const { categories } = storeToRefs(useCategories());
const issues = computed(() =>
  (searchResponse.value?.items ?? []).map((issue) => ({
    ...issue,
    editAvailability: issueLocks.getEditAvailability(issue.id),
    legend: categories.value?.find((legend) => legend.id === issue.legend_id),
  }))
);
const totalItems = computed(() => searchResponse.value?.total ?? 0);

function issueURL(item: SearchIssue) {
  return `/kaart/${item.slug || item.id}`;
}

function gotoIssue(_event: Event, { item }: { item: SearchIssue }) {
  navigateTo(`/kaart/${item.slug || item.id}`);
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

.thumbnail {
  display: block;
  margin: 0.5rem auto 0.5rem auto;
  text-align: center;
}

.legend-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.issue-actions {
  display: grid;
  grid-template-columns: repeat(3, 40px);
  align-items: center;
  gap: 4px;
}
</style>

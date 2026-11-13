<template>
  <div>
    <IssueSearchTable
      v-model:page="state.page"
      v-model:items-per-page="state.itemsPerPage"
      v-model:search="state.search"
      :items="issues"
      :total-items="totalItems"
      :pending="pending"
      :emphasize-filter="emphasizeFilter"
      @row-click="gotoIssue"
      @edit="openEditDialog"
      @delete="confirmDelete"
      @info="showIssueInfo"
      @comments="showComments"
    />

    <IssueEditDialog
      v-model:dialog="editDialog"
      v-model:issue="issueToEdit"
      :loading="loadingEdit"
      @save="handleEditSaved"
      @cancel="editDialog = false"
    />

    <IssueDeleteDialog
      v-model="deleteDialog"
      :title="issueToDelete?.title ?? ''"
      :loading="deleting"
      :disabled="
        !issueToDelete ||
        !issueLocks.getEditAvailability(issueToDelete.id).canEdit
      "
      @confirm="deleteIssue"
    />

    <IssueInfoDialog
      v-model="infoDialog"
      :loading="loadingInfo"
      :updated-by-name="updatedByName"
      :updated-at="updatedAt"
    />

    <IssueCommentsDialog
      v-model="commentsDialog"
      :issue-id="issueForComments?.id ?? null"
      :title="issueForComments?.title"
    />
  </div>
</template>

<script setup lang="ts">
import { refDebounced } from "@vueuse/core";
import type { Issue } from "~~/shared/types/Issue";
import type { IssueSearchItem } from "~/types/IssueSearch";

useTitle("Onderwerpen");

const { trackSiteSearch } = useMatomoTracking();
const issueLocks = useIssueLocks();
const { get: getIssue, getUpdatedBy, remove: removeIssue } = useIssuesMethods();
const { showError } = useSnackbar();
const { token } = useAuth();
const authHeaders = computed(() => {
  if (!token.value) return undefined;
  // Remove "Bearer " if it's already there, then add it back
  const cleanToken = token.value.replace(/^Bearer\s+/i, "");
  return {
    Authorization: `Bearer ${cleanToken}`,
  };
});

// Persistent state management using Nuxt's useState
const state = useState("issues-state", () => ({
  search: "",
  page: 1,
  itemsPerPage: 10,
}));

type SearchResponse = {
  items: IssueSearchItem[];
  total: number;
};

const editDialog = ref(false);
const loadingEdit = ref(false);
const issueToEdit = ref<Issue | null>(null);
const activeEditLockId = ref<number | null>(null);
useIssueEditLock(
  computed(() => (editDialog.value ? activeEditLockId.value : null)),
);
const deleteDialog = ref(false);
const deleting = ref(false);
const issueToDelete = ref<IssueSearchItem | null>(null);
const infoDialog = ref(false);
const issueForInfo = ref<IssueSearchItem | null>(null);
const loadingInfo = ref(false);
const updatedByName = ref<string | null>(null);
const updatedAt = ref<string | null>(null);
const commentsDialog = ref(false);
const issueForComments = ref<IssueSearchItem | null>(null);

async function openEditDialog(item: IssueSearchItem) {
  if (!issueLocks.getEditAvailability(item.id).canEdit) return;

  activeEditLockId.value = item.id;
  issueToEdit.value = null;
  editDialog.value = true;
  loadingEdit.value = true;
  try {
    const issue = await getIssue(item.id);
    if (activeEditLockId.value === item.id) {
      // Verify lock is still available after getIssue() completes
      if (!issueLocks.getEditAvailability(item.id).canEdit) {
        editDialog.value = false;
        activeEditLockId.value = null;
        showError("Onderwerp wordt door iemand anders bewerkt");
        return;
      }
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

function confirmDelete(item: IssueSearchItem) {
  if (!issueLocks.getEditAvailability(item.id).canEdit) return;
  issueToDelete.value = item;
  deleteDialog.value = true;
}

async function deleteIssue() {
  if (
    !issueToDelete.value ||
    !issueLocks.getEditAvailability(issueToDelete.value.id).canEdit
  )
    return;

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

async function showIssueInfo(item: IssueSearchItem) {
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

function showComments(item: IssueSearchItem) {
  issueForComments.value = item;
  commentsDialog.value = true;
}

// Reset pagination when search changes
watch(
  () => state.value.search,
  (newSearch, oldSearch) => {
    if (newSearch !== oldSearch) {
      state.value.page = 1;
    }
  },
);

// Throttle outgoing search requests; dedupe:'cancel' aborts any request still in flight.
const debouncedSearch = refDebounced(
  computed(() => state.value.search ?? ""),
  300,
);

const query = computed(() => ({
  page: state.value.page,
  itemsPerPage: state.value.itemsPerPage,
  search: debouncedSearch.value,
}));
const filters = computed(() =>
  parseSearchTerms(query.value.search).map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ),
);
const { emphasizeFilter } = useFilter(filters);
const {
  data: searchResponse,
  pending,
  refresh: refreshResults,
} = await useFetch<SearchResponse>("/api/issues/search", {
  query,
  headers: authHeaders,
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
  if (
    ["issue-created", "issue-modified", "issue-deleted"].includes(message.type)
  ) {
    refreshResults();
  }
});
onUnmounted(unsubscribe);

// Comment counts come from the search results too; refresh them on comment activity.
const authWs = useSharedAuthWebSocket();
const unsubscribeComments = authWs.subscribe((message) => {
  if (
    ["comment-created", "comment-modified", "comment-deleted"].includes(
      message.type,
    )
  ) {
    refreshResults();
  }
});
onUnmounted(unsubscribeComments);
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
    ...issueLocks.getEditAvailability(issue.id),
    legend: categories.value?.find((legend) => legend.id === issue.legend_id),
  })),
);
const totalItems = computed(() => searchResponse.value?.total ?? 0);

function gotoIssue(_event: Event, item: IssueSearchItem) {
  navigateTo(`/kaart/${item.slug || item.id}`);
}
</script>

<style>
.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}
</style>

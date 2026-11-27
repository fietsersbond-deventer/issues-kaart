<template>
  <div>
    <IssueSearchTable
      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      v-model:search="search"
      :items="issues"
      :total-items="totalItems"
      :pending="pending"
      :emphasize-filter="emphasizeFilter"
      @row-click="gotoIssue"
      @edit="openEditDialog"
      @delete="confirmDelete"
      @info="showIssueInfo"
      @comments="showComments"
    >
      <template #actions>
        <IssueFilter />
      </template>
    </IssueSearchTable>

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

const route = useRoute();
const router = useRouter();
const filterQuery = useFilterQuery();

// Search (?s=), page, page size and the category/tag filters live in the URL, so a
// selection can be shared and is kept when switching between map and list.
// Changes are pushed, so the browser back button undoes them.
function updateQuery(
  changes: Record<string, string | undefined>,
  { replace = false } = {},
) {
  const query = Object.fromEntries(
    Object.entries({ ...route.query, ...changes }).filter(
      ([, value]) => value !== undefined,
    ),
  );
  return replace ? router.replace({ query }) : router.push({ query });
}

const urlSearch = computed(() =>
  typeof route.query.s === "string" ? route.query.s : "",
);
const page = computed({
  get: () => {
    const value = Number(route.query.page);
    return Number.isInteger(value) && value > 0 ? value : 1;
  },
  set: (value: number) =>
    updateQuery({ page: value > 1 ? String(value) : undefined }),
});

const DEFAULT_PAGE_SIZE = 10;
// The search API accepts at most 100 items per page.
const itemsPerPage = computed({
  get: () => {
    const value = Number(route.query.pageSize);
    return Number.isInteger(value) && value > 0 && value <= 100
      ? value
      : DEFAULT_PAGE_SIZE;
  },
  // Another page size gives different pages: start at the first one.
  set: (value: number) =>
    updateQuery({
      pageSize: value !== DEFAULT_PAGE_SIZE ? String(value) : undefined,
      page: undefined,
    }),
});

// The input updates immediately; the URL (and thus the request) is debounced.
const search = ref(urlSearch.value);
const debouncedSearch = refDebounced(
  computed(() => search.value ?? ""),
  300,
);
watch(debouncedSearch, (value) => {
  if (value !== urlSearch.value)
    updateQuery({ s: value || undefined, page: undefined });
});
// Follow URL changes from elsewhere, such as browser back/forward.
watch(urlSearch, (value) => {
  if (value !== debouncedSearch.value) search.value = value;
});

// Remember search, page and page size, so the list link brings them back after a visit
// to the map. Only on the list itself: route also changes while leaving.
const { rememberListQuery } = useListQuery();
watch(
  () => route.query,
  (query) => {
    if (route.path === "/lijst") rememberListQuery(query);
  },
  { immediate: true },
);

// A different filter gives different pages: start at the first one.
watch([() => route.query.cat, () => route.query.tag], () => {
  // replace: the filter change itself is already in the history
  if (route.query.page) updateQuery({ page: undefined }, { replace: true });
});

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

// dedupe:'cancel' aborts any request still in flight.
const query = computed(() => ({
  page: page.value,
  itemsPerPage: itemsPerPage.value,
  search: urlSearch.value,
  ...filterQuery.value,
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

watch(urlSearch, () => {
  nextTick(() => {
    if (urlSearch.value) {
      trackSiteSearch(urlSearch.value, totalItems.value);
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
  navigateTo({
    path: `/kaart/${item.slug || item.id}`,
    query: filterQuery.value,
  });
}
</script>

<style>
.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}
</style>

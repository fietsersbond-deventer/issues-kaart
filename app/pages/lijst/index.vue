<!-- eslint-disable vue/valid-v-slot -->
<template>
  <div>
    <v-card class="mb-4">
      <v-card-title v-if="!isPrinting" class="d-flex align-center" style="gap: 16px">
        <v-text-field
          v-model="state.search"
          label="Zoek"
          dense
          hide-details
          clearable
        />
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
          @click:row="gotoIssue"
          :items-per-page-options="[5, 10, 25, 50]"
          show-current-page
        >
          <template #item.imageUrl="{ item }">
            <img v-if="item.imageUrl" :src="item.imageUrl" class="thumbnail"></img>           
          </template>

          <template #item.legend="{ item }">
            <category-chip v-if="item.legend" :legend="item.legend" />
          </template>

          <template #item.title="{ item }">
            <span v-html="emphasizeFilter(item.title)" />
          </template>

          <template #item.snippets="{ item }">
            <span v-html="emphasizeFilter(item.snippets.join(' '))" />
          </template>


          <template #item.actions="{ item }">
            <div> 
              <template>
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

  </div>
</template>

<script setup lang="ts">
import { useMediaQuery, refDebounced } from '@vueuse/core'
import CategoryChip from '~/components/CategoryChip.vue';
import { parseSearchTerms } from '~/utils/parseSearchTerms';
import type { Legend } from '~~/shared/types/Legend';

useTitle("Onderwerpen");

const isPrinting = useMediaQuery('print')

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
  title: string;
  legend_id: number;
  created_at: string;
  imageUrl: string | null;
  snippets: string[];
  legend?: Legend;
};

type SearchResponse = {
  items: SearchIssue[];
  total: number;
};

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
  parseSearchTerms(query.value.search)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
);
const { emphasizeFilter } = useFilter(filters);
const { data: searchResponse, pending } = await useFetch<SearchResponse>(
  "/api/issues/search",
  { query, dedupe: "cancel" }
);

const { legends } = storeToRefs(useLegends());
const issues = computed(() =>
  (searchResponse.value?.items ?? []).map((issue) => ({
    ...issue,
    legend: legends.value?.find((legend) => legend.id === issue.legend_id),
  }))
);
const totalItems = computed(() => searchResponse.value?.total ?? 0);

function gotoIssue(_event: Event, { item }: { item: SearchIssue }) {
  navigateTo(`/kaart/${item.id}`)
}

const headers = computed(() => {
  return [
    { title: "", value: "imageUrl", sortable: false },
    { title: "Titel", value: "title", sortable: true, width: "40%" },
    { title: "Categorie", value: "legend", sortable: true },
    { title: "Gevonden tekst", value: "snippets", sortable: false, width: "20%" },
  ];
});

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
  max-width: 100px;
  max-height: 100px;
  display: block;
  margin: 0.5rem auto 0.5rem auto;
  text-align: center;
}

</style>

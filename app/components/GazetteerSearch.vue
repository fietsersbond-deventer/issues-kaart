<template>
  <div class="bg-surface-bright d-flex align-center ga-2 py-1">
    <div id="search-autocomplete" class="w-100" style="height: 40px">
      <v-menu
        v-model="menuOpen"
        :close-on-content-click="false"
        location="bottom"
      >
        <template #activator="{ props }">
          <v-text-field
            v-bind="props"
            v-model="searchInput"
            placeholder="Zoeken"
            density="compact"
            :class="['c-gazetteer', 'bg-surface-bright']"
            :loading="isLoading"
            hide-details
            clearable
            @keydown.enter="selectFirstResult"
          />
        </template>

        <div
          v-if="isLoading || hasResults || searchInput"
          class="d-flex align-start ga-2"
        >
          <v-list class="c-search-results" style="max-width: 490px">
            <v-list-item v-if="isLoading" class="px-2">
              <template #prepend>
                <v-progress-circular
                  indeterminate
                  size="20"
                  width="2"
                  class="mr-3"
                />
              </template>
              <template #title>Zoeken…</template>
            </v-list-item>

            <v-list-item
              v-else-if="!hasResults"
              class="px-2 text-medium-emphasis"
            >
              <template #title>Geen resultaten gevonden</template>
            </v-list-item>

            <template v-else>
              <template v-if="issueEntries.length > 0">
                <v-list-subheader>Onderwerpen</v-list-subheader>
                <v-list-item
                  v-for="item in issueEntries"
                  :key="`issue-${item.id}`"
                  class="px-2"
                  @click="selectIssue(item)"
                  @mouseenter="hoveredResult = item"
                  @mouseleave="hoveredResult = undefined"
                >
                  <template #prepend>
                    <span class="d-flex align-center justify-center mr-3">
                      <v-icon icon="mdi-map-marker-outline" size="20" />
                    </span>
                  </template>
                  <template #title>
                    <div class="text-truncate">{{ item.title }}</div>
                  </template>
                </v-list-item>
              </template>

              <template v-if="entries.length > 0">
                <v-list-subheader>Locaties</v-list-subheader>
                <v-list-item
                  v-for="(item, index) in entries"
                  :key="index"
                  class="px-2"
                  @click="selectItem(item)"
                  @mouseenter="hoveredResult = item"
                  @mouseleave="hoveredResult = undefined"
                >
                  <template #prepend>
                    <span class="d-flex align-center justify-center mr-3">
                      <SearchResultIcon :item="item" />
                    </span>
                  </template>
                  <template #title>
                    <div class="text-truncate">
                      <!-- If labelHtml is present, use v-html to render it. Otherwise, fall back to the plain label. -->
                      <!-- v-html is used here to allow for highlighted search terms or other HTML formatting provided by the search provider. -->
                      <!-- labelHtml is guaranteed to be sanitized before being passed to this component, ensuring that it is safe to render. -->
                      <!-- eslint-disable vue/no-v-html -->
                      <span
                        v-if="getLabelHtml(item)"
                        v-html="getLabelHtml(item)"
                      />
                      <!-- eslint-enable vue/no-v-html -->
                      <span v-else>{{ getLabel(item) }}</span>
                    </div>
                  </template>
                </v-list-item>
              </template>
            </template>
          </v-list>
          <SearchResultPreviewMap
            v-if="hoveredResult"
            :lat="hoveredResult.lat"
            :lon="hoveredResult.lon"
            :boundingbox="hoveredResult.boundingbox"
            :geometry="hoveredResult.geometry"
          />
        </div>
      </v-menu>
    </div>
    <div>
      <v-btn
        variant="text"
        text="Zoek"
        class="bg-primary text-surface-bright mr-1"
        @click="selectFirstResult"
      ></v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Geometry } from "geojson";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLabel(item: any): string {
  return item?.label || item?.raw?.label || "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLabelHtml(item: any): string | undefined {
  return item?.labelHtml || item?.raw?.labelHtml;
}

const searchInput = ref("");
const isLoading = ref(false);
const selected = defineModel<SearchResult | undefined>();
const entries = ref<SearchResult[]>([]);
const issueEntries = ref<IssueSearchResult[]>([]);
const menuOpen = ref(false);
const { bbox: areaBbox } = useCurrentArea();
const hasResults = computed(
  () => entries.value.length > 0 || issueEntries.value.length > 0,
);

type PreviewTarget = {
  lat: number;
  lon: number;
  boundingbox?: SearchResult["boundingbox"];
  geometry?: Geometry;
};

// Toont waar een zoekresultaat ligt zodra de gebruiker er met de muis overheen gaat,
// via een eigen klein kaartje (zodat de grote kaart niet hoeft te verspringen).
const hoveredResult = ref<PreviewTarget | undefined>();
let searchController: AbortController | undefined;

watch(selected, (val) => {
  if (val === undefined) searchInput.value = "";
});

watch(menuOpen, (open) => {
  if (!open) hoveredResult.value = undefined;
});

function selectItem(item: SearchResult) {
  selected.value = item;
  menuOpen.value = false;
  hoveredResult.value = undefined;
}

// Navigeren selecteert het onderwerp op de kaart; de URL-gedreven focuslogica
// (zie useMapFocus) zorgt zelf voor het inzoomen.
function selectIssue(item: IssueSearchResult) {
  menuOpen.value = false;
  hoveredResult.value = undefined;
  navigateTo(`/kaart/${item.slug || item.id}`);
}

function selectFirstResult() {
  const first = issueEntries.value?.[0];
  if (first) {
    selectIssue(first);
    return;
  }
  const firstEntry = entries.value?.[0];
  if (firstEntry) {
    selectItem(firstEntry);
  }
}

const { searchParams = { countrycodes: "nl" } } = defineProps<{
  searchParams?: GazetteerSearchParams;
}>();

async function searchItems(val: string) {
  searchController?.abort();
  const controller = new AbortController();
  searchController = controller;
  isLoading.value = true;
  // Start with base searchParams
  const params = { ...searchParams };
  params.signal = controller.signal;
  // Zonder zichtbare-kaartuitsnede valt terug op het gebied van deze instantie (bv. Deventer).
  if (!params.bbox && areaBbox) {
    const [west, south, east, north] = areaBbox;
    params.bbox = { west, south, east, north };
  }

  // Alleen LocationIQ; onderwerpen blijven altijd actief.
  const [locationResult, issueResult] = await Promise.all([
    LocationIQSearchProvider.search(val, params),
    $fetch<IssueSearchResult[]>("/api/issues/search-locations", {
      query: { search: val },
      signal: controller.signal,
    }).catch(() => []),
  ]);
  if (controller.signal.aborted) return;
  entries.value = locationResult;
  issueEntries.value = issueResult;
  isLoading.value = false;
}

let timeout: NodeJS.Timeout | undefined;
watch(searchInput, async (value) => {
  clearTimeout(timeout);
  searchController?.abort();
  isLoading.value = false;

  if (!value) {
    entries.value = [];
    issueEntries.value = [];
    isLoading.value = false;
    menuOpen.value = false;
    hoveredResult.value = undefined;
    return;
  }

  // Open menu when searching
  menuOpen.value = true;

  // first try whether the coordinates can be determined directly
  const items = await tryCoordinateProviders(value);
  if (value !== searchInput.value) return;

  if (items) {
    entries.value = items;
    issueEntries.value = [];
  } else {
    timeout = setTimeout(() => {
      void searchItems(value);
    }, 1000);
  }
});

onBeforeUnmount(() => {
  clearTimeout(timeout);
  searchController?.abort();
});
</script>

<style>
.c-gazetteer {
  width: 100%;
  max-height: 40px;
}

.c-gazetteer .v-text-field .v-input__control .v-input__slot {
  height: 40px !important;
}

.c-gazetteer .v-field__outline {
  display: none;
}

.c-gazetteer .v-field__input {
  align-items: center !important;
  height: 40px !important;
  padding: 0 8px;
}

.c-gazetteer .v-field__append-inner {
  padding: 0 4px;
}

.c-gazetteer input {
  text-align: left;
}

.c-gazetteer--coord-active input {
  color: rgba(var(--v-theme-primary), 1) !important;
}

#pdok-options .v-overlay__content {
  border-radius: 12px;
  transform: translateY(8px);
}

.c_search-collection {
  height: fit-content;
}

.c_search-collection:hover {
  background-color: rgba(var(--v-theme-surface-bright), 1);
  opacity: 1;
  cursor: default;
}

.c-search-results {
  max-width: min(490px, calc(100vw - 16px)) !important;
  max-height: 400px !important;
  border-radius: 12px !important;
  background-color: rgba(var(--v-theme-surface-bright), 1) !important;
  box-shadow: none !important;
  transform: translateX(-40px) translateY(4px);
  overflow-y: auto !important;
}

.c-search-preview-marker {
  pointer-events: none;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
}
</style>

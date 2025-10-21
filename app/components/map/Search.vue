<template>
  <div class="map-search-control">
    <!-- Mobile: Search button that expands -->
    <v-btn
      v-if="mobile && !isExpanded"
      icon
      size="small"
      class="search-button"
      title="Zoek locatie"
      :loading="isSearching"
      @click="toggleSearch"
    >
      <v-icon>mdi-magnify</v-icon>
    </v-btn>

    <!-- Desktop or expanded mobile search -->
    <v-autocomplete
      v-if="!mobile || isExpanded"
      ref="searchInput"
      v-model="selectedItem"
      v-model:search="searchText"
      :items="searchResults"
      :loading="isSearching"
      :menu="searchResults.length > 0"
      item-title="displayName"
      item-value="id"
      placeholder="Zoek locatie..."
      hide-no-data
      hide-details
      density="compact"
      variant="solo"
      clearable
      auto-select-first
      @update:model-value="onSelect"
      @blur="onBlur"
    >
      <template #prepend-inner>
        <v-btn
          v-if="mobile"
          icon
          size="x-small"
          variant="text"
          @click="closeSearch"
        >
          <v-icon size="18">mdi-arrow-left</v-icon>
        </v-btn>
      </template>
      <template #append-inner>
        <v-progress-circular
          v-if="isSearching"
          indeterminate
          size="20"
          width="2"
          color="primary"
        />
      </template>
      <template #item="{ props, item }">
        <v-list-item v-bind="props" :title="item.raw.displayName">
          <template #subtitle>
            <span class="text-caption">{{ item.raw.type }}</span>
          </template>
        </v-list-item>
      </template>
    </v-autocomplete>
  </div>
</template>

<script lang="ts" setup>
import type { BBox } from "geojson";
import { transformBboxToOpenLayers } from "~/utils/getIssuesBbox";
import {
  NominatimSearchProvider,
  type SearchResult,
  useLocationSearch,
} from "~/composables/useLocationSearch";
import { useDisplay } from "vuetify";

const emit = defineEmits<{
  selected: [data: BBox];
  searchExpanded: [expanded: boolean];
}>();

const { mobile } = useDisplay();
const searchProvider = new NominatimSearchProvider();
const { search: performSearch, isSearching } =
  useLocationSearch(searchProvider);

const searchText = ref("");
const selectedItem = ref<string | null>(null);
const searchResults = ref<SearchResult[]>([]);
const isExpanded = ref(false);
const searchInput = ref();

function toggleSearch() {
  console.log(
    "Toggle search - before:",
    isExpanded.value,
    "mobile:",
    mobile.value
  );
  isExpanded.value = !isExpanded.value;
  console.log("Toggle search - after:", isExpanded.value);
  emit("searchExpanded", isExpanded.value);

  if (isExpanded.value) {
    // Focus the input after it's rendered
    nextTick(() => {
      console.log("Trying to focus input:", searchInput.value);
      searchInput.value?.focus();
    });
  }
}

function closeSearch() {
  isExpanded.value = false;
  searchText.value = "";
  searchResults.value = [];
  emit("searchExpanded", false);
}

function onBlur() {
  // On mobile, close search if there's no search text
  if (mobile.value && !searchText.value) {
    setTimeout(() => {
      closeSearch();
    }, 200);
  }
}

// Watch for search text changes with debounce
let searchTimeout: NodeJS.Timeout;
watch(searchText, (value) => {
  clearTimeout(searchTimeout);

  if (!value || value.trim().length === 0) {
    searchResults.value = [];
    return;
  }

  searchTimeout = setTimeout(async () => {
    console.log("Searching for:", value);
    const results = await performSearch(value);
    console.log("Got results:", results.length);

    if (results.length === 0) {
      searchResults.value = [
        {
          id: "no-results",
          name: "Geen resultaten gevonden",
          displayName: "Geen resultaten gevonden",
          type: "no-results",
          boundingBox: [0, 0, 0, 0] as BBox,
          coordinates: [0, 0] as [number, number],
        },
      ];
    } else {
      // Create a new array to ensure reactivity
      searchResults.value = [...results];
    }

    // Force update on next tick
    await nextTick();
    console.log("Search results updated:", searchResults.value.length);
  }, 300);
});

function onSelect(itemId: string | null) {
  if (!itemId || itemId === "no-results") return;

  const result = searchResults.value.find((r) => r.id === itemId);
  if (!result) return;

  const boundingBox = transformBboxToOpenLayers(result.boundingBox);
  emit("selected", boundingBox);

  // Clear selection and close on mobile
  selectedItem.value = null;
  if (mobile.value) {
    closeSearch();
  }
}
</script>

<style scoped>
.search-button {
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

@media (min-width: 600px) {
  .map-search-control :deep(.v-autocomplete) {
    width: 300px;
  }
}

@media (max-width: 599px) {
  .map-search-control :deep(.v-autocomplete) {
    width: calc(100vw - 1em);
    max-width: 400px;
  }
}

.map-search-control :deep(.v-field) {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  background: white;
}

.map-search-control :deep(.v-autocomplete__menu-content) {
  max-height: 400px;
}
</style>

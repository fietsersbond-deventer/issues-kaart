<template>
  <div class="bg-surface-container-high d-flex align-center ga-2 py-1">
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
            :class="['c-gazetteer', 'bg-surface-container-high']"
            :loading="isLoading"
            hide-details
            clearable
            @keydown.enter="selectFirstResult"
          />
        </template>

        <v-list
          v-if="entries.length > 0"
          class="c-search-results"
          style="max-width: 490px"
        >
          <v-list-item
            v-for="(item, index) in entries"
            :key="index"
            class="px-2"
            @click="selectItem(item)"
          >
            <template #prepend>
              <v-tooltip :text="getCollectionId(item)" location="top left">
                <template #activator="{ props: iconProps }">
                  <span
                    v-bind="iconProps"
                    class="d-flex align-center justify-center mr-3"
                  >
                    <SearchResultIcon :item="item" />
                  </span>
                </template>
              </v-tooltip>
            </template>
            <template #title>
              <v-tooltip :text="getLabel(item)" location="top left">
                <template #activator="{ props: tooltipProps }">
                  <div v-bind="tooltipProps" class="text-truncate">
                    <!-- If labelHtml is present, use v-html to render it. Otherwise, fall back to the plain label. -->
                    <!-- v-html is used here to allow for highlighted search terms or other HTML formatting provided by the search provider. -->
                    <!-- labelHtml is guaranteed to be sanitized before being passed to this component, ensuring that it is safe to render. -->
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <span
                      v-if="getLabelHtml(item)"
                      v-html="getLabelHtml(item)"
                    />
                    <span v-else>{{ getLabel(item) }}</span>
                  </div>
                </template>
              </v-tooltip>
            </template>
          </v-list-item>
        </v-list>
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
import type { GazetteerPDOKSearchParams } from "~~/server/utils/PDOKSearchProvider";

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
const searchInMapFrame = ref(false);
const menuOpen = ref(false);
const { bbox } = useCurrentArea();

watch(selected, (val) => {
  if (val === undefined) searchInput.value = "";
});

function selectItem(item: SearchResult) {
  selected.value = item;
  menuOpen.value = false;
}

function selectFirstResult() {
  if (entries.value && entries.value.length > 0) {
    selectItem(entries.value[0]);
  }
}

const { searchParams = { countrycodes: "nl" } } = defineProps<{
  searchParams?: GazetteerPDOKSearchParams;
}>();

const collections = ref<Partial<PDOKSearchCollections>>(
  searchParams?.collections
    ? JSON.parse(JSON.stringify(searchParams.collections))
    : Object.fromEntries(
        Object.entries(PDOKSearchProvider.defaultCollections).filter(
          ([, config]) => config?.version === 1,
        ),
      ),
);

function reset() {
  collections.value = searchParams?.collections
    ? JSON.parse(JSON.stringify(searchParams.collections))
    : Object.fromEntries(
        Object.entries(PDOKSearchProvider.defaultCollections).filter(
          ([, config]) => config?.version === 1,
        ),
      );
}

async function searchItems(val: string) {
  isLoading.value = true;
  // Start with base searchParams
  const params = { ...searchParams };
  // Use default collections if none are configured (e.g., unsaved project)
  params.collections =
    Object.keys(collections.value).length > 0
      ? collections.value
      : Object.fromEntries(
          Object.entries(PDOKSearchProvider.defaultCollections).filter(
            ([, config]) => config?.version === 1,
          ),
        );

  if (searchInMapFrame.value) {
    const bbox = await getViewportBbox();
    if (bbox) {
      params.bbox = bbox;
    }
  }

  const result = await searchProvider.value.search(val, params);
  entries.value = result as SearchResult[];
  isLoading.value = false;
}

// verwijder oude zoekresultaten wanneer de zoekcollecties worden aangepast, omdat deze resultaten mogelijk niet meer relevant zijn
// en voer een nieuwe zoekopdracht uit als er een zoekterm is ingevuld
watch(
  collections,
  async () => {
    entries.value = [];
    // If user has already entered a search term, re-search with new collection settings
    if (searchInput.value?.length) {
      await searchItems(searchInput.value);
    }
  },
  { deep: true },
);

let timeout: NodeJS.Timeout | undefined;
watch(searchInput, async (value) => {
  if (!value) {
    clearTimeout(timeout);
    entries.value = [];
    isLoading.value = false;
    menuOpen.value = false;
    return;
  }

  // Open menu when searching
  menuOpen.value = true;

  // first try whether the coordinates can be determined directly
  const items = await tryCoordinateProviders(value);

  if (items) {
    entries.value = items;
  } else {
    clearTimeout(timeout); // Cleanup previous one
    timeout = setTimeout(() => searchItems(value), 500);
    if (isLoading.value) return;

    clearTimeout(timeout);
    searchItems(value);
  }
});
</script>

<style lang="scss">
.c-gazetteer {
  width: 100%;
  max-height: 40px;

  .v-text-field .v-input__control .v-input__slot {
    height: 40px !important;
  }

  .v-field__outline {
    display: none;
  }

  .v-field__input {
    align-items: center !important;
    height: 40px !important;
    padding: 0 8px;
  }

  .v-field__append-inner {
    padding: 0 4px;
  }

  input {
    text-align: left;
  }
}

.c-gazetteer--coord-active {
  input {
    color: rgba(var(--v-theme-primary), 1) !important;
  }
}

#pdok-options {
  .v-overlay__content {
    border-radius: 12px;
    transform: translateY(8px);
  }
}

.c_search-collection {
  height: fit-content;

  &:hover {
    background-color: rgba(var(--v-theme-surface-bright), 1);
    opacity: 1;
    cursor: default;
  }
}

.c-search-results {
  max-width: 490px !important;
  max-height: 400px !important;
  border-radius: 12px !important;
  background-color: rgba(var(--v-theme-surface-container-high), 1) !important;
  box-shadow: none !important;
  transform: translateX(-40px) translateY(4px);
  overflow-y: auto !important;
}
</style>

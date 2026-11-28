<template>
  <v-badge :model-value="hasActiveFilters" color="primary" dot>
    <v-btn
      v-tooltip:top="'Filter op categorie en tag'"
      icon="mdi-filter-cog"
      variant="text"
      aria-label="Filter"
      @click="dialog = true"
    />
  </v-badge>

  <v-dialog v-model="dialog" max-width="480" scrollable>
    <v-card title="Filter">
      <v-card-text>
        <div class="text-subtitle-2 mb-2">Categorie</div>
        <div class="filter-chips">
          <CategoryChip
            v-for="category in usedCategories"
            :key="category.id"
            :legend="category"
          />
        </div>
        <template v-if="usedTags.length">
          <div class="text-subtitle-2 mt-4 mb-2">Tags</div>
          <div class="filter-chips">
            <Tag
              v-for="tag in usedTags"
              :key="tag.tag"
              :tag="tag"
              :disabled="isTagDisabled(tag.tag)"
            />
          </div>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-btn
          :disabled="!hasActiveFilters"
          prepend-icon="mdi-restore"
          @click="resetFilters"
        >
          Toon alles
        </v-btn>
        <v-spacer />
        <v-btn color="primary" @click="dialog = false">Sluiten</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const dialog = ref(false);
const route = useRoute();
const categoryFilters = useCategoryFilters();
const tagFilters = useTagFilters();
const issuesStore = useIssues();
const { usedCategories } = storeToRefs(categoryFilters);
const { issues } = storeToRefs(issuesStore);
const { selectedIssues } = useSelectedIssues();
const { getTag } = useTagsApi();

// All tags on any issue, so tags don't vanish while filtering.
const usedTags = computed(() => {
  const slugs = new Set<string>();
  for (const issue of issues.value) {
    for (const tag of issue.tags ?? []) slugs.add(tag);
  }
  return [...slugs].sort().map(getTag);
});

// A tag without results can't be added; an active tag can always be removed.
const selectedTagSlugs = computed(
  () => new Set(selectedIssues.value.flatMap((issue) => issue.tags ?? [])),
);
function isTagDisabled(tag: string) {
  return !selectedTagSlugs.value.has(tag) && !tagFilters.hasTag(tag);
}

// The available categories and tags come from all issues.
onMounted(() => {
  if (!issuesStore.isLoaded) void issuesStore.load();
});

// Use the URL directly: the stores only know which categories are used
// once all issues are loaded.
const hasActiveFilters = computed(() =>
  Boolean(route.query.cat || route.query.tag),
);

const resetFilters = useResetFilters();
</script>

<style scoped>
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>

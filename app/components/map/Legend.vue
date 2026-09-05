<template>
  <div class="legend-container">
    <v-table class="legend-list pa-2">
      <tr
        v-for="item in visibleLegends"
        :key="item.id"
        class="legend-item clickable"
        :class="{
          'legend-item--disabled': !isLegendVisible(item.id),
          'legend-item--unavailable': !availableLegendIds.has(item.id),
        }"
        density="compact"
        tabindex="0"
        role="checkbox"
        :aria-checked="isLegendVisible(item.id)"
        :aria-disabled="!availableLegendIds.has(item.id)"
        @click="toggleLegendIfAvailable(item.id)"
        @keydown.enter.prevent="toggleLegendIfAvailable(item.id)"
        @keydown.space.prevent="toggleLegendIfAvailable(item.id)"
      >
        <td>
          <LegendIndicator :legend="item" :size="24" />
        </td>
        <td class="text-body-2 text-truncate pa-2">{{ item.name }}</td>
        <td>
          <v-tooltip v-if="item.description" :text="item.description" location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" icon="mdi-information" size="x-small" color="grey" />
            </template>
          </v-tooltip>
        </td>
        <td class="ps-2 font-weight-thin">
          {{ countIssues[item.id] }}
        </td>
      </tr>
      <tr v-if="usedTags.length" class="section-heading">
        <td colspan="4" class="text-caption text-medium-emphasis">Tags</td>
      </tr>
      <tr v-if="usedTags.length">
        <td colspan="4">
          <div class="tag-grid">
            <Tag
              v-for="tag in usedTags"
              :key="tag.tag"
              :tag="tag"
              stretch
              :active="hasTag(tag.tag)"
              :disabled="!hasTag(tag.tag) && !availableTagSlugs.has(tag.tag)"
              @click="toggleTagIfAvailable(tag.tag)"
            >
              <template #append>
                <span class="tag-count">{{ tagCounts[tag.tag] ?? 0 }}</span>
              </template>
            </Tag>
          </div>
        </td>
      </tr>
    </v-table>
  </div>
</template>

<script setup lang="ts">
const { legends } = storeToRefs(useLegends());
const { toggleLegendVisibility, isLegendVisible } = useLegendFilters();
const { tags } = useTagsApi();
const { hasTag, toggleTag } = useTagFilters();
const { allIssues, selectedIssues } = storeToRefs(useMapIssueSelection());
const { selectedTagSlugs: selectedTagFilterSlugs } = storeToRefs(useTagFilters());

// Only show legends that are actually used in the map
const visibleLegends = computed(() => {
  const usedLegendIds = new Set(
    allIssues.value
      ?.map((issue) => issue.legend_id)
      .filter((id): id is number => id != null) || []
  );
  return legends.value?.filter((legend) => usedLegendIds.has(legend.id)) ?? [];
});

const availableLegendIds = computed(() => {
  const ids = new Set<number>();
  for (const issue of allIssues.value) {
    const matchesTags = [...selectedTagFilterSlugs.value].every((tag) =>
      issue.tags?.includes(tag)
    );
    if (matchesTags && issue.legend_id != null) ids.add(issue.legend_id);
  }
  return ids;
});

function toggleLegendIfAvailable(legendId: number) {
  if (!availableLegendIds.value.has(legendId)) return;
  toggleLegendVisibility(legendId);
}

const countIssues = computed(() => {
  const counts: Record<number, number> = {};
  allIssues.value.forEach((issue) => {
    const matchesTags = [...selectedTagFilterSlugs.value].every((tag) =>
      issue.tags?.includes(tag)
    );
    if (!matchesTags) return;

    counts[issue.legend_id] = (counts[issue.legend_id] ?? 0) + 1;
  });

  return counts;
});

const availableTagSlugs = computed(() => {
  const slugs = new Set<string>();
  for (const issue of selectedIssues.value) {
    for (const tag of issue.tags ?? []) slugs.add(tag);
  }
  return slugs;
});

const tagCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const issue of selectedIssues.value) {
    for (const tag of issue.tags ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
});

const globallyUsedTagSlugs = computed(() => {
  const slugs = new Set<string>();
  for (const issue of allIssues.value) {
    for (const tag of issue.tags ?? []) slugs.add(tag);
  }
  return slugs;
});

const usedTags = computed(() =>
  (tags.value ?? []).filter((tag) => globallyUsedTagSlugs.value.has(tag.tag))
);

function toggleTagIfAvailable(tag: string) {
  if (!selectedTagFilterSlugs.value.has(tag) && !availableTagSlugs.value.has(tag)) {
    return;
  }
  toggleTag(tag);
}
</script>

<style scoped>
.legend-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden; /* Contain the overflow */
}

.legend-list {
  overflow-y: auto !important;
  max-height: 100% !important;
  padding: 0;
}

.legend-item {
  min-height: 28px !important;
  height: 28px !important;
  padding: 0 8px !important;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

.legend-item.clickable {
  cursor: pointer;
}

.legend-item.clickable:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.legend-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.legend-item--disabled {
  opacity: 0.4;
}

.legend-item--disabled:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.legend-item--unavailable {
  cursor: not-allowed;
  opacity: 0.45;
}

.legend-item--unavailable:hover {
  background-color: transparent;
}

.tag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 6px;
  padding: 8px;
}

.tag-count {
  min-width: 1.25em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.legend-icon-image {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}
</style>

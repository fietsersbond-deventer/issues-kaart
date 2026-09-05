<template>
  <div class="legend-container">
    <v-table class="legend-list pa-2">
      <tr
        v-for="item in visibleLegends"
        :key="item.id"
        class="legend-item clickable"
        :class="{ 'legend-item--disabled': !isLegendVisible(item.id) }"
        density="compact"
        tabindex="0"
        role="checkbox"
        :aria-checked="isLegendVisible(item.id)"
        @click="toggleLegendVisibility(item.id)"
        @keydown.enter.prevent="toggleLegendVisibility(item.id)"
        @keydown.space.prevent="toggleLegendVisibility(item.id)"
      >
        <td>
          <LegendIndicator :legend="item" :size="24" />
        </td>
        <td class="text-body-2 text-truncate pa-2">{{ item.name }}</td>
        <td>
          <v-tooltip
            v-if="item.description"
            :text="item.description"
            location="top"
          >
            <template #activator="{ props }">
              <v-icon
                v-bind="props"
                icon="mdi-information"
                size="x-small"
                color="grey"
              />
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
      <tr
        v-for="tag in usedTags"
        :key="tag.tag"
        class="tag-item clickable"
        :class="{ 'tag-item--selected': hasTag(tag.tag) }"
        tabindex="0"
        role="checkbox"
        :aria-checked="hasTag(tag.tag)"
        @click="toggleTag(tag.tag)"
        @keydown.enter.prevent="toggleTag(tag.tag)"
        @keydown.space.prevent="toggleTag(tag.tag)"
      >
        <td colspan="3">
          <Tag :tag="tag" />
        </td>
        <td class="ps-2 font-weight-thin">{{ tagCounts[tag.tag] }}</td>
      </tr>
    </v-table>
  </div>
</template>

<script setup lang="ts">
const { legends } = storeToRefs(useLegends());
const { toggleLegendVisibility, isLegendVisible } = useLegendFilters();
const { tags } = useTagsApi();
const { hasTag, toggleTag } = useMapFilters();

// Only need legend_id to determine which legends are visible
const { issues } = storeToRefs(useIssues({ fields: "id,legend_id,tags" }));

// Only show legends that are actually used in the map
const visibleLegends = computed(() => {
  const usedLegendIds = new Set(
    issues.value
      ?.map((issue) => issue.legend_id)
      .filter((id): id is number => id != null) || [],
  );
  return legends.value?.filter((legend) => usedLegendIds.has(legend.id)) ?? [];
});

const countIssues = computed(() => {
  const counts: Record<number, number> = {};
  issues.value.forEach((issue) => {
    counts[issue.legend_id] = (counts[issue.legend_id] ?? 0) + 1;
  });

  return counts;
});

const tagCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const issue of issues.value) {
    for (const tag of issue.tags ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
});

const usedTags = computed(() =>
  (tags.value ?? []).filter((tag) => (tagCounts.value[tag.tag] ?? 0) > 0),
);
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
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;
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

.tag-item {
  min-height: 36px !important;
  height: 36px !important;
  padding: 0 8px !important;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;
}

.tag-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.tag-item--selected {
  background-color: rgba(var(--v-theme-primary), 0.12);
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
}

.tag-item--selected:hover {
  background-color: rgba(var(--v-theme-primary), 0.18);
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

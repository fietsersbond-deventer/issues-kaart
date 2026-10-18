<template>
  <div class="legend-container pa-2">
    <v-table class="legend-list categories-list pa-2">
      <tr
        v-for="item in usedCategories"
        :key="item.id"
        class="legend-item clickable"
        :class="{ 'legend-item--disabled': !isCategoryVisible(item.id) }"
        density="compact"
        tabindex="0"
        role="checkbox"
        :aria-checked="isCategoryVisible(item.id)"
        @click="toggleCategoryVisibility(item.id)"
        @keydown.enter.prevent="toggleCategoryVisibility(item.id)"
        @keydown.space.prevent="toggleCategoryVisibility(item.id)"
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
        <td class="ps-2 font-weight-thin text-right counter">
          {{ countIssues[item.id] }}
        </td>
      </tr>
    </v-table>
    <v-table v-if="usedTags.length" class="legend-list tags-list pa-2">
      <tr
        v-for="tag in usedTags"
        :key="`tag-${tag.tag}`"
        class="legend-item clickable"
        :class="{ 'legend-item--disabled': isTagDisabled(tag.tag) }"
        density="compact"
        tabindex="0"
        role="checkbox"
        :aria-checked="hasTag(tag.tag)"
        :aria-disabled="isTagDisabled(tag.tag)"
        @click="onTagClick(tag.tag)"
        @keydown.enter.prevent="onTagClick(tag.tag)"
        @keydown.space.prevent="onTagClick(tag.tag)"
      >
        <td colspan="2" class="py-1">
          <!-- description is shown via the info icon, not Tag's own tooltip -->
          <Tag
            :tag="{ ...tag, description: null }"
            :active="hasTag(tag.tag)"
            class="w-100"
          />
        </td>
        <td>
          <v-tooltip v-if="tag.description" :text="tag.description" location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" icon="mdi-information" size="x-small" color="grey" />
            </template>
          </v-tooltip>
        </td>
        <td class="ps-2 font-weight-thin text-right counter">
          {{ selectedIssuesTagCount[tag.tag] ?? 0 }}
        </td>
      </tr>
    </v-table>
  </div>
</template>

<script setup lang="ts">
const { toggleCategoryVisibility, isCategoryVisible } = useCategoryFilters();
const { usedCategories } = storeToRefs(useCategoryFilters());
const { issues } = storeToRefs(useIssues());
const { selectedIssues } = useSelectedIssues();
const { hasTag, toggleTag } = useTagFilters();
const { getTag } = useTagsApi();

const selectedIssuesTagCount = computed(() => {
  const counts: Record<string, number> = {};
  for (const issue of selectedIssues.value) {
    for (const tag of issue.tags ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
});

// All tags that occur on any issue, so tags don't vanish while filtering.
const usedTags = computed(() => {
  const slugs = new Set<string>();
  for (const issue of issues.value) {
    for (const tag of issue.tags ?? []) slugs.add(tag);
  }
  return [...slugs].sort().map(getTag);
});

// An active tag stays clickable so it can always be deselected.
function isTagDisabled(tag: string) {
  return !selectedIssuesTagCount.value[tag] && !hasTag(tag);
}

function onTagClick(tag: string) {
  if (!isTagDisabled(tag)) toggleTag(tag);
}

const countIssues = computed(() => {
  const counts: Record<number, number> = {};
  selectedIssues.value.forEach((issue) => {
    counts[issue.legend_id] = (counts[issue.legend_id] ?? 0) + 1;
  });

  return counts;
});
</script>

<style scoped>
.legend-container {
  height: auto;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden; /* Contain the overflow */
}

.legend-list {
  padding: 0;
}

/* Categorieën scrollen nooit: deze moeten altijd volledig zichtbaar zijn. */
.categories-list {
  flex: 0 0 auto;
}

/*
 * Vuetify rendert de daadwerkelijke scrollcontainer als een interne
 * .v-table__wrapper div (niet het buitenste .v-table-element), dus
 * overflow en scrollbar-gutter moeten daar via :deep() worden toegepast.
 * We forceren scrollbar-gutter: stable hier ook (zelfs zonder scrollbar),
 * zodat deze tabel dezelfde breedte reserveert als de tags-tabel eronder.
 * Zo blijven de tellerkolommen van beide tabellen mooi uitgelijnd.
 */
.categories-list :deep(.v-table__wrapper) {
  overflow-y: hidden;
  scrollbar-gutter: stable;
}

/* Tags nemen alleen de ruimte die ze nodig hebben en scrollen zodra max-height wordt overschreden. */
.tags-list {
  flex: 0 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tags-list :deep(.v-table__wrapper) {
  overflow-y: auto;
  height: auto;
  max-height: var(--legend-tags-max-height, 10em);
  scrollbar-gutter: stable;
}

.legend-item {
  min-height: 28px !important;
  height: 28px !important;
  padding: 0 8px !important;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

.counter {
  width: 3em;
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

.legend-item[aria-disabled="true"] {
  pointer-events: none;
}

.legend-item--disabled:hover {
  background-color: rgba(0, 0, 0, 0.08);
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

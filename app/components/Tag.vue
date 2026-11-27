<template>
  <v-chip
    label
    :color="active ? 'primary' : undefined"
    :variant="active ? 'flat' : 'tonal'"
    size="small"
    class="tag-chip"
    :aria-pressed="filterable ? active : undefined"
    v-on="filterable ? { click: onClick } : {}"
  >
    <template #prepend>
      <v-icon
        v-if="active"
        icon="mdi-check"
        size="16"
        class="mr-1 d-print-none"
      />
      <AppIcon :icon="iconName" size="16" class="mr-2" />
    </template>
    {{ tag.label || tag.tag }}
    <template #append>
      <slot name="append" />
    </template>
    <v-tooltip
      v-if="tag.description"
      activator="parent"
      location="top"
      max-width="40em"
    >
      <template #default>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="tooltip-content" v-html="tag.description" />
      </template>
    </v-tooltip>
  </v-chip>
</template>

<script setup lang="ts">
import type { Tag } from "~~/shared/types/Tag";
defineOptions({ name: "IssueTag" });

// filterable: clicking toggles the tag in the ?tag= filter. Off where a click
// means something else, such as choosing tags in a form.
const { tag, filterable = true } = defineProps<{
  tag: Tag;
  filterable?: boolean;
}>();

// Active when this tag is selected in the ?tag= filter; only shown where
// clicking can change that.
const { hasTag, toggleTag } = useTagFilters();
const active = computed(() => filterable && hasTag(tag.tag));

function onClick(event: MouseEvent) {
  // Chips may sit inside links or clickable rows: only toggle the filter.
  event.stopPropagation();
  event.preventDefault();
  void toggleTag(tag.tag);
}

const iconName = computed(() => {
  if (!tag.icon) return "mdi-tag-outline";
  return tag.icon;
});
</script>

<style scoped>
.tag-chip--clickable {
  cursor: pointer;
}
</style>

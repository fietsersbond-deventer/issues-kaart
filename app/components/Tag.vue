<template>
  <v-chip
    label
    :color="active ? 'primary' : undefined"
    :variant="active ? 'flat' : 'tonal'"
    size="small"
    class="tag-chip"
  >
    <template #prepend>
      <v-icon :icon="iconName" size="16" />
    </template>
    {{ tag.label || tag.tag }}
    <template #append>
      <slot name="append" />
    </template>
    <v-tooltip v-if="tag.description" activator="parent" location="top">
      {{ tag.description }}
    </v-tooltip>
  </v-chip>
</template>

<script setup lang="ts">
import type { Tag } from "~~/shared/types/Tag";

const props = defineProps<{
  tag: Tag;
  active?: boolean;
}>();

const iconName = computed(() => {
  if (!props.tag.icon) return "mdi-tag-outline";
  return props.tag.icon;
});
</script>

<style scoped>
.tag-chip--clickable {
  cursor: pointer;
}

.tag-chip.active {
  font-weight: 600;
}
</style>

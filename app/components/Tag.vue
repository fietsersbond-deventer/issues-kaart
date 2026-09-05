<template>
  <v-chip label variant="tonal" size="small">
    <template #prepend>
      <v-icon :icon="iconName" size="16" />
    </template>
    {{ tag.label || tag.tag }}
  </v-chip>
</template>

<script setup lang="ts">
import type { Tag } from "~~/shared/types/Tag";

const props = defineProps<{
  tag: Tag;
}>();

const iconName = computed(() => {
  if (!props.tag.icon) return "mdi-tag-outline";
  return props.tag.icon.startsWith("mdi-")
    ? props.tag.icon
    : `mdi-${props.tag.icon}`;
});
</script>

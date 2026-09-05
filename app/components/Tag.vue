<template>
  <v-chip
    label
    :to="to"
    :disabled="disabled"
    :color="active ? 'primary' : undefined"
    :variant="active ? 'flat' : 'tonal'"
    size="small"
    class="tag-chip"
    :class="{
      active,
      'tag-chip--clickable': !to,
      'tag-chip--stretch': stretch,
    }"
    :aria-pressed="to ? undefined : active"
  >
    <template #prepend>
      <v-icon :icon="iconName" size="16" />
    </template>
    {{ tag.label || tag.tag }}
    <template #append>
      <slot name="append" />
    </template>
  </v-chip>
</template>

<script setup lang="ts">
import type { Tag } from "~~/shared/types/Tag";

const props = defineProps<{
  tag: Tag;
  active?: boolean;
  to?: string;
  disabled?: boolean;
  stretch?: boolean;
}>();

const iconName = computed(() => {
  if (!props.tag.icon) return "mdi-tag-outline";
  return props.tag.icon.startsWith("mdi-") ? props.tag.icon : `mdi-${props.tag.icon}`;
});
</script>

<style scoped>
.tag-chip--clickable {
  cursor: pointer;
}

.tag-chip.active {
  font-weight: 600;
}

.tag-chip--stretch {
  width: 100%;
}

.tag-chip--stretch :deep(.v-chip__content) {
  width: 100%;
}

.tag-chip--stretch :deep(.v-chip__append) {
  margin-left: auto;
}
</style>

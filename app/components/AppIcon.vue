<template>
  <Icon
    v-if="isIconify"
    :name="icon"
    :size="size"
    :style="color ? { color } : undefined"
  />
  <v-icon v-else :icon="icon" :size="size" :color="color" />
</template>

<script setup lang="ts">
const props = defineProps<{
  icon: string;
  size?: string | number;
  color?: string;
}>();

// "prefix:name" is an Iconify icon; "mdi-name" is a legacy MDI font icon
const isIconify = computed(() => props.icon.includes(":"));
</script>

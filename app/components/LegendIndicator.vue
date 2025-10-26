<template>
  <div
    class="legend-indicator"
    :style="{
      height: size + 'px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
    }"
  >
    <template v-if="icon">
      <!-- Point icon -->
      <v-icon :icon="icon" :color="color" :size="size" />
      <!-- Line/polygon indicator -->
      <v-icon icon="mdi-vector-polyline" :color="color" :size="size" />
    </template>
    <div
      v-else
      class="color-rectangle"
      :style="{
        backgroundColor: color,
        width: size * 2 + 4 + 'px',
        height: size + 'px',
        borderRadius: '4px',
        border: '1px solid rgba(0, 0, 0, 0.12)',
      }"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  color: string;
  icon?: string | null;
  size?: number;
}

withDefaults(defineProps<Props>(), {
  icon: null,
  size: 20,
});
</script>

<style scoped>
.legend-indicator {
  flex-shrink: 0;
}
</style>

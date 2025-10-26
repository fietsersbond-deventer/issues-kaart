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
    <template v-if="legend?.icon">
      <!-- Show circular icon like on the map -->
      <div
        class="icon-circle"
        :style="{
          width: size + 'px',
          height: size + 'px',
          backgroundColor: legend.color || '#2196F3',
          borderRadius: '50%',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }"
      >
        <v-icon 
          :icon="legend.icon" 
          :color="getContrastColor(legend.color || '#2196F3')" 
          :size="Math.round(size * 0.6)"
        />
      </div>
      <!-- Line/polygon indicator -->
      <v-icon icon="mdi-vector-polyline" :color="legend.color" :size="size" />
    </template>
    <div
      v-else
      class="color-rectangle"
      :style="{
        backgroundColor: legend.color,
        width: size * 2 + 4 + 'px',
        height: size + 'px',
        borderRadius: '4px',
        border: '1px solid rgba(0, 0, 0, 0.12)',
      }"
    />
  </div>
</template>

<script setup lang="ts">
import type { Legend } from "~/types/Legend";

interface Props {
  legend: Pick<Legend, "name" | "color" | "icon" | "icon_data_url"> & {
    id?: number;
  };
  size: number;
}

const { legend, size } = defineProps<Props>();

// Calculate contrast color based on background luminance
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance using WCAG formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
</script>

<style scoped>
.legend-indicator {
  flex-shrink: 0;
}
</style>

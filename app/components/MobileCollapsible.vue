<template>
  <!-- Desktop view -->
  <div v-if="!mobile" class="desktop-content">
    <slot />
  </div>

  <!-- Mobile view -->
  <div v-else class="mobile-view">
    <v-expansion-panels v-model="panelModel">
      <v-expansion-panel
        :expand-icon="icon"
        collapse-icon="mdi-chevron-down"
        :value="0"
      >
        <v-expansion-panel-title>{{ title }}</v-expansion-panel-title>
        <v-expansion-panel-text eager>
          <slot />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
const panelModel = defineModel<boolean>({
  required: false,
});

defineProps<{
  title: string;
  icon?: string;
}>();

const { mobile } = useDisplay();

// Reset expanded state when switching to desktop
watch(mobile, (isMobile) => {
  if (!isMobile) {
    panelModel.value = false;
  }
});
</script>

<style scoped>
.mobile-view {
  width: 100%;
  min-width: 200px;
}

.mobile-view :deep(.v-expansion-panel) {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

/* Ensure Vuetify styles take precedence */
.mobile-view :deep(.v-expansion-panel-title .v-expansion-panel-title__icon) {
  margin-left: 8px;
}

.desktop-content {
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>

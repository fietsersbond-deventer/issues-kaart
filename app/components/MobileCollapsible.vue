<template>
  <!-- Desktop view -->
  <div v-if="!mobile" class="desktop-content">
    <slot />
  </div>

  <!-- Mobile view -->
  <div v-else class="mobile-view">
    <v-expansion-panels v-model="panelModel">
      <v-expansion-panel>
        <v-expansion-panel-title>{{ title }}</v-expansion-panel-title>
        <v-expansion-panel-text eager>
          <slot />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  defaultExpanded?: boolean;
}>();

const { mobile } = useDisplay();
const panelModel = ref(props.defaultExpanded ? 0 : null);

// Reset expanded state when switching to desktop
watch(mobile, (isMobile) => {
  if (!isMobile) {
    panelModel.value = null;
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

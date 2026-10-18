<template>
  <v-navigation-drawer
    v-model="open"
    location="left"
    :width="300"
    :temporary="temporary"
    disable-route-watcher
    class="map-side-panel"
  >
    <v-btn
      icon
      size="small"
      class="map-side-panel-close"
      title="Paneel sluiten"
      aria-label="Kaartlagen en legenda sluiten"
      @click="open = false"
    >
      <v-icon>mdi-menu-open</v-icon>
    </v-btn>

    <div class="map-side-panel-content">
      <MapLayerSwitcher v-model="preferredLayer" />
      <MapLegend class="mt-3" />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
defineProps<{ temporary?: boolean }>();

const { open } = useMapMenu();
const { preferredLayer } = useMapLayerPreference();
</script>

<style scoped>
.map-side-panel {
  z-index: 6002 !important;
}

/* Same position as the open button in the map's top-left control */
.map-side-panel-close {
  position: absolute;
  top: 0.5em;
  left: 0.5em;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.map-side-panel-content {
  padding: 56px 12px 12px;
}
</style>

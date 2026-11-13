<template>
  <v-layout class="desktop-layout">
    <v-main class="map-main">
      <Map class="fill-height">
        <template #bottom-left-controls="{ mapWidth }">
          <div
            class="map-menu-panel"
            :style="{ maxWidth: mapWidth ? `${mapWidth / 2}px` : undefined }"
          >
            <v-expansion-panels v-model="panel">
              <v-expansion-panel
                title="Legenda en kaartlagen"
                collapse-icon="mdi-chevron-down"
                expand-icon="mdi-chevron-up"
              >
                <v-expansion-panel-text>
                  <div class="map-menu-panel-text">
                    <MapLegend class="map-menu-panel-legend" />
                    <!-- Altijd zichtbaar onderaan -->
                    <MapLayerSwitcher
                      v-model="preferredLayer"
                      class="map-menu-panel-layers"
                    />
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </template>
      </Map>
    </v-main>

    <v-navigation-drawer
      location="right"
      :width="drawerWidth"
      app
      disable-route-watcher
      persistent
    >
      <div class="navigation-content">
        <div class="main-content">
          <NuxtPage />
        </div>
      </div>
    </v-navigation-drawer>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

// legend/layer panel is open by default on desktop
const panel = ref<number | undefined>(0);

const { preferredLayer } = useMapLayerPreference();

const drawerWidth = ref(600);

const updateDrawerWidth = () => {
  drawerWidth.value = Math.min(window.innerWidth * 0.5, 600);
};

onMounted(() => {
  updateDrawerWidth();
  window.addEventListener("resize", updateDrawerWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateDrawerWidth);
});
</script>

<style scoped>
.desktop-layout {
  display: flex;
  flex-direction: row;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-main {
  transition: width 0.3s ease;
}

.map-menu-panel {
  min-width: 250px;
  background: white;
}

/* Beperk de hoogte zodat de legenda scrolt in plaats van het paneel te laten groeien */
.map-menu-panel-text {
  display: flex;
  flex-direction: column;
  max-height: 60vh;
}

.map-menu-panel-legend {
  flex: 1 1 auto;
  min-height: 0;
}

.map-menu-panel-layers {
  flex-shrink: 0;
  padding: 8px;
}
</style>

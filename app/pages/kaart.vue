<template>
  <v-layout class="rounded rounded-md border" height="100%">
    <v-main class="d-flex align-center justify-center" height="100%" fluid>
      <v-container class="fill-height">
        <v-sheet color="surface-light" class="fill-height d-flex" width="100%">
          <Map class="flex-grow-1" @feature-clicked="onFeatureClicked" />
        </v-sheet>
      </v-container>
    </v-main>
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      width="400"
      app
      class="d-flex"
      :temporary="isMobile"
      :scrim="isMobile"
    >
      <div class="navigation-content">
        <div class="main-content">
          <NuxtPage />
        </div>
        <div class="legend-wrapper">
          <MapLegend />
        </div>
      </div>
    </v-navigation-drawer>
    <v-btn
      v-if="isMobile"
      icon="mdi-menu"
      style="position: absolute; top: 16px; right: 16px; z-index: 6001"
      class="open-drawer-btn"
      @click="drawer = !drawer"
    />
  </v-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

definePageMeta({
  title: "Kaart",
});

useMapEventBus().provide();

const reactiveFeature = new ReactiveFeature();
useEditableFeature().provide(reactiveFeature);

const drawer = ref(true);
const isMobile = ref(false);

function checkScreen() {
  isMobile.value = window.innerWidth < 900;
  if (isMobile.value) drawer.value = false;
  else drawer.value = true;
}

onMounted(() => {
  checkScreen();
  window.addEventListener("resize", checkScreen);
});
onUnmounted(() => {
  window.removeEventListener("resize", checkScreen);
});

function onFeatureClicked() {
  if (isMobile.value) drawer.value = true;
}
</script>

<style>
.leaflet-container {
  height: 100%;
  display: block;
}

.navigation-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.main-content {
  flex: 2;
  overflow-y: auto;
}

.legend-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background: white;
}

.open-drawer-btn {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>

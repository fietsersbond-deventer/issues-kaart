<template>
  <v-layout class="rounded rounded-md border" height="100%">
    <v-main class="d-flex align-center justify-center" height="100%" fluid>
      <v-container class="fill-height">
        <v-sheet color="surface-light" class="fill-height d-flex" width="100%">
          <Map class="flex-grow-1" />
        </v-sheet>
      </v-container>
    </v-main>
    <v-navigation-drawer location="right" width="400" app class="d-flex">
      <div class="navigation-content">
        <div class="main-content">
          <NuxtPage />
        </div>
        <div class="legend-wrapper">
          <MapLegend />
        </div>
      </div>
    </v-navigation-drawer>
  </v-layout>
</template>

<script setup lang="ts">
definePageMeta({
  title: "Kaart",
});

useMapEventBus().provide();

const reactiveFeature = new ReactiveFeature();
useEditableFeature().provide(reactiveFeature);
</script>

<style>
.leaflet-container {
  height: 100%;
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
</style>

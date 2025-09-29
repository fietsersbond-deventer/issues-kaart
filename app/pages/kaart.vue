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
      width="600"
      app
      class="d-flex"
      disable-route-watcher
      persistent
      :temporary="mobile"
      :scrim="mobile"
    >
      <div class="navigation-content">
        <div class="main-content">
          <NuxtPage />
        </div>
      </div>
    </v-navigation-drawer>
    <v-btn
      v-if="mobile"
      :icon="drawer ? 'mdi-arrow-left' : 'mdi-menu'"
      style="position: absolute; top: 16px; right: 16px; z-index: 6001"
      class="open-drawer-btn"
      @click="drawer = !drawer"
    />
  </v-layout>
</template>

<script setup lang="ts">
definePageMeta({
  title: "kaart",
});

useMapEventBus().provide();
const drawer = ref(true);
const { mobile } = useDisplay();

watchEffect(() => {
  if (mobile.value) {
    drawer.value = false;
  } else {
    drawer.value = true;
  }
});

function onFeatureClicked() {
  if (mobile.value) drawer.value = true;
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

.open-drawer-btn {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>

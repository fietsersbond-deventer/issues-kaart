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
      :temporary="isMobile"
      :scrim="isMobile"
    >
      <div class="navigation-content">
        <div class="main-content">
          <template v-if="route.name === 'kaart'">
            <div class="pa-4">
              <h1 class="text-h4 mb-4">Welkom bij de Fietsersbond Deventer</h1>
              <v-card variant="flat" class="mb-4 pa-4">
                <p class="text-body-1 mb-4">
                  Deze kaart toont alle punten waar we ons mee bezig houden.
                </p>
                <p class="text-body-1 mb-4">
                  <strong>Om te beginnen:</strong>
                </p>
                <ul class="mb-4">
                  <li class="mb-2">
                    Klik op een punt op de kaart om de details te bekijken
                  </li>
                  <li class="mb-2">
                    Gebruik de zoomknoppen of scroll met je muis om in en uit te
                    zoomen
                  </li>
                  <li class="mb-2">
                    Zoek een locatie met de zoekbalk linksboven
                  </li>
                  <li class="mb-2">
                    Bekijk de legenda om te zien wat de kleuren betekenen
                  </li>
                </ul>
              </v-card>
            </div>
          </template>
          <NuxtPage />
        </div>
      </div>
    </v-navigation-drawer>
    <v-btn
      v-if="isMobile"
      :icon="drawer ? 'mdi-arrow-left' : 'mdi-menu'"
      style="position: absolute; top: 16px; right: 16px; z-index: 6001"
      class="open-drawer-btn"
      @click="drawer = !drawer"
    />
  </v-layout>
</template>

<script setup lang="ts">
definePageMeta({
  title: "Kaart",
});

const route = useRoute();
useMapEventBus().provide();
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

.open-drawer-btn {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>

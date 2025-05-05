<template>
  <v-layout class="rounded rounded-md border" height="100%">
    <v-app-bar color="surface-variant" title="Application bar" />

    <v-navigation-drawer>
      <v-list nav>
        <div class="absolute bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <Toolbar />
        </div>
      </v-list>
    </v-navigation-drawer>

    <v-navigation-drawer location="right">
      <NuxtPage />
    </v-navigation-drawer>

    <v-main class="d-flex align-center justify-center" height="100%" fluid>
      <v-container class="fill-height">
        <v-sheet
          border="dashed md"
          color="surface-light"
          class="fill-height d-flex"
          rounded="lg"
          width="100%"
        >
          <Map class="flex-grow-1" />
        </v-sheet>
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { useMapEventBus } from "~/composables/useMapEventBus";

useMapEventBus().provide();

const reactiveFeature = new ReactiveFeature();

useEditableFeature().provide(reactiveFeature);
</script>

<style>
.leaflet-container {
  height: 100%;
}
</style>

<template>
  <div class="search-control d-flex align-center">
    <v-btn
      icon
      size="small"
      variant="text"
      title="Zoeken"
      @click="active = !active"
    >
      <v-icon>mdi-magnify</v-icon>
    </v-btn>
    <v-expand-x-transition>
      <v-card v-show="active" flat width="600px" class="bg-surface-bright">
        <Gazetteer v-model="location" />
      </v-card>
    </v-expand-x-transition>
  </div>
</template>

<script setup lang="ts">
import type OlMap from "ol/Map";
import { fromLonLat } from "ol/proj";

const active = ref(false);
const location = ref<SearchResult | undefined>();
const map = inject<OlMap>("map");

// Wis de selectie zodra de zoekbalk wordt dichtgeklapt.
watch(active, (isActive) => {
  if (!isActive) location.value = undefined;
});

watch(location, (selected) => {
  if (selected) zoomToResult(selected);
});

function zoomToResult(result: SearchResult) {
  const view = map?.getView();
  if (!view) return;

  if (result.boundingbox) {
    const { south, west, north, east } = result.boundingbox;
    view.fit(transformBboxToOpenLayers([west, south, east, north]), {
      padding: [50, 50, 50, 50],
      maxZoom: 18,
      duration: 500,
    });
  } else {
    view.animate({
      center: fromLonLat([result.lon, result.lat]),
      zoom: Math.max(view.getZoom() ?? 0, 16),
      duration: 500,
    });
  }
}
</script>

<style scoped>
.search-control {
  width: fit-content;
  min-height: 40px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
</style>

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
      <v-card v-show="active" flat class="search-card bg-surface-bright">
        <GazetteerSearch v-model="location" />
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
  if (!selected) return;
  zoomToResult(selected);
  active.value = false;
});

function zoomToResult(result: SearchResult) {
  const view = map?.getView();
  if (!view) return;

  // Een vrijwel puntvormige bbox (bv. een exact adres) laten fitten levert een
  // onbruikbaar uitgezoomd resultaat op; behandel die dan gewoon als een punt.
  const MIN_BBOX_SPAN = 0.0005; // graden, ruwweg 50 meter
  const { boundingbox } = result;
  const hasUsableBbox =
    boundingbox &&
    Math.abs(boundingbox.east - boundingbox.west) > MIN_BBOX_SPAN &&
    Math.abs(boundingbox.north - boundingbox.south) > MIN_BBOX_SPAN;

  if (hasUsableBbox) {
    const { south, west, north, east } = boundingbox;
    view.fit(transformBboxToOpenLayers([west, south, east, north]), {
      padding: [50, 50, 50, 50],
      maxZoom: 18,
      duration: 500,
    });
  } else {
    view.animate({
      center: fromLonLat([result.lon, result.lat]),
      zoom: Math.max(view.getZoom() ?? 0, 17),
      duration: 500,
    });
  }
}
</script>

<style scoped>
.search-control {
  width: fit-content;
  max-width: 100%;
  min-height: 40px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* Krimpt mee met de kaartbreedte, die kleiner wordt door het zijpaneel. */
.search-card {
  width: 600px;
  flex: 0 1 auto;
  min-width: 0;
}
</style>

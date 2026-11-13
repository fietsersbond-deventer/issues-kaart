<template>
  <v-icon :icon="icon" size="20" />
</template>

<script setup lang="ts">
const COLLECTION_ICONS: Record<string, string> = {
  adres: "mdi-map-marker",
  gebouw: "mdi-home-city-outline",
  geografisch_gebied: "mdi-terrain",
  inrichtingselement: "mdi-domain",
  perceel: "mdi-shape-outline",
  plaats: "mdi-city",
  woonplaats: "mdi-city",
  provinciegebied: "mdi-flag-outline",
  gemeentegebied: "mdi-flag-variant-outline",
  functioneel_gebied: "mdi-map-marker-outline",
  spoorbaandeel: "mdi-train",
  wegdeel: "mdi-road-variant",
  waterdeel: "mdi-waves",
  coordinate: "mdi-crosshairs-gps",
};

const props = defineProps<{
  item: SearchResult;
}>();

const icon = computed(
  () => COLLECTION_ICONS[getCollectionId(props.item) ?? ""] ?? "mdi-map-marker",
);
</script>

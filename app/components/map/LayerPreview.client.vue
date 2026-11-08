<template>
  <ol-map class="mini-map" :controls="[]">
    <ol-view
      :center="center"
      :zoom="zoom - 3"
      :rotation="rotation"
      projection="EPSG:3857"
    />

    <!-- Light layer -->
    <ol-tile-layer v-if="name === 'Licht'" :visible="true">
      <ol-source-xyz
        url="https://cartodb-basemaps-{a-d}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png?key=cb1_2g3h_1_01ad081dc8ac0a49f3be7436"
      />
    </ol-tile-layer>

    <!-- Cycle layer -->
    <ol-tile-layer v-if="name === 'Fiets'" :visible="true">
      <ol-source-xyz
        url="https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
      />
    </ol-tile-layer>

    <!-- Photo layer -->
    <ol-tile-layer v-if="name === 'Foto'" :visible="true">
      <ol-source-tile-wms
        url="https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0"
        layers="Actueel_ortho25"
      />
    </ol-tile-layer>
  </ol-map>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  center: number[];
  zoom: number;
  rotation: number;
}>();
</script>

<template>
  <div class="layer-switcher">
    <div class="mini-maps">
      <div
        v-for="layer in layers"
        :key="layer.name"
        class="mini-map-container"
        :class="{ active: selectedLayer === layer.name }"
        @click="selectLayer(layer.name)"
      >
        <ol-map class="mini-map" :controls="[]">
          <ol-view
            :center="center"
            :zoom="zoom - 3"
            :rotation="rotation"
            projection="EPSG:3857"
          />

          <!-- Light layer -->
          <ol-tile-layer v-if="layer.name === 'Licht'" :visible="true">
            <ol-source-stadia-maps layer="alidade_smooth" />
          </ol-tile-layer>

          <!-- Cycle layer -->
          <ol-tile-layer v-if="layer.name === 'Fiets'" :visible="true">
            <ol-source-xyz
              url="https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
            />
          </ol-tile-layer>

          <!-- Photo layer -->
          <ol-tile-layer v-if="layer.name === 'Foto'" :visible="true">
            <ol-source-tile-wms
              url="https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0"
              layers="Actueel_ortho25"
            />
          </ol-tile-layer>
        </ol-map>

        <div class="layer-label">{{ layer.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const selectedLayer = defineModel<string>();

// Use the map view composable to sync with main map
const { center, zoom, rotation } = useMapView();

const layers = [{ name: "Licht" }, { name: "Fiets" }, { name: "Foto" }];

function selectLayer(layerName: string) {
  selectedLayer.value = layerName;
}
</script>

<style scoped>
.mini-maps {
  display: flex;
  gap: 4px;
  background: white;
  padding: 4px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.mini-map-container {
  position: relative;
  width: 60px;
  height: 60px;
  border: 2px solid transparent;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.mini-map-container:hover {
  border-color: rgba(0, 0, 0, 0.2);
}

.mini-map-container.active {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.mini-map {
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.mini-map :deep(.ol-viewport) {
  border-radius: 2px;
}

.mini-map :deep(.ol-overlaycontainer-stopevent) {
  display: none;
}

.active-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgb(var(--v-theme-primary));
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.layer-label {
  position: absolute;
  bottom: 2px;
  left: 0;
  right: 0;
  text-align: center;
  background: rgba(255, 255, 255, 0.3);
  color: #333;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 4px;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}
</style>

<template>
  <div class="layer-switcher">
    <div class="mini-maps">
      <div
        v-for="mapLayer in layers"
        :key="mapLayer.name"
        class="mini-map-container"
        :class="{ active: selectedLayer === mapLayer.name }"
        tabindex="0"
        role="button"
        :aria-pressed="selectedLayer === mapLayer.name"
        :aria-label="`Kaartlaag ${mapLayer.name}`"
        @click="selectLayer(mapLayer.name)"
        @keydown.enter.prevent="selectLayer(mapLayer.name)"
        @keydown.space.prevent="selectLayer(mapLayer.name)"
      >
        <MapLayerPreview
          :name="mapLayer.name"
          :center="center"
          :zoom="zoom"
          :rotation="rotation"
        />

        <div class="layer-label">{{ mapLayer.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const selectedLayer = defineModel<string>();

// Shared view state kept in sync by the main map
const { center, zoom, rotation } = useMapViewState();

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

.mini-map-container:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
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

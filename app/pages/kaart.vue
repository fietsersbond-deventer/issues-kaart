<template>
  <v-layout class="rounded rounded-md border map-layout">
    <v-main
      class="map-main"
      :style="mobile ? { height: `${100 - sheetHeight}%` } : {}"
    >
      <Map class="fill-height" @feature-clicked="onFeatureClicked" />
    </v-main>

    <div
      v-if="mobile"
      class="bottom-sheet"
      :style="{ height: `${sheetHeight}%` }"
    >
      <div
        class="drag-handle"
        @touchstart="startDrag"
        @touchmove="onDrag"
        @touchend="endDrag"
        @mousedown="startDragMouse"
      >
        <div class="drag-indicator" />
      </div>
      <div class="sheet-content">
        <NuxtPage />
      </div>
    </div>

    <v-navigation-drawer
      v-else
      v-model="drawer"
      location="right"
      width="600"
      app
      class="d-flex"
      disable-route-watcher
      persistent
    >
      <div class="navigation-content">
        <div class="main-content">
          <NuxtPage />
        </div>
      </div>
    </v-navigation-drawer>
  </v-layout>
</template>

<script setup lang="ts">
definePageMeta({
  title: "kaart",
});

useMapEventBus().provide();
const drawer = ref(true);
const { mobile } = useDisplay();

const { sheetHeight, startDrag, onDrag, endDrag, startDragMouse } =
  useBottomSheet({
    defaultHeight: 30,
    minHeight: 10,
    maxHeight: 75,
    snapPoints: [30, 75],
  });

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

<style scoped>
.map-layout {
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-main {
  width: 100%;
  padding: 0 !important;
  margin: 0 !important;
  transition: height 0.3s ease;
  position: relative;
}

.map-main :deep(.v-main__wrap) {
  padding: 0 !important;
}

.leaflet-container {
  height: 100%;
  display: block;
}

.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  overflow: hidden;
  z-index: 6001;
  transition: height 0.1s ease-out;
}

.drag-handle {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 24px;
  background: #f0f0f0;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  cursor: grab;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-indicator {
  width: 40px;
  height: 4px;
  background: #ccc;
  border-radius: 2px;
}

.sheet-content {
  overflow-y: auto;
  height: calc(100% - 24px);
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
</style>

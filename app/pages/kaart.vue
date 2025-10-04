<template>
  <v-layout class="rounded rounded-md border" height="100%">
    <v-main class="d-flex align-center justify-center" height="100%" fluid>
      <v-container class="fill-height">
        <v-sheet color="surface-light" class="fill-height d-flex" width="100%">
          <Map class="flex-grow-1" @feature-clicked="onFeatureClicked" />
        </v-sheet>
      </v-container>
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
const sheetHeight = ref(30); // Default height as a percentage to show the first part of the content
const startY = ref(0);
const initialHeight = ref(0);
const isDragging = ref(false);

watchEffect(() => {
  if (mobile.value) {
    drawer.value = false;
    sheetHeight.value = 30; // Default height for the bottom sheet in percentage
  } else {
    drawer.value = true;
  }
});

function onFeatureClicked() {
  if (mobile.value) drawer.value = true;
}

// Touch event handlers
function startDrag(event: TouchEvent) {
  event.preventDefault();
  if (event.touches[0]) {
    startY.value = event.touches[0].clientY;
    initialHeight.value = sheetHeight.value;
  }
}

function onDrag(event: TouchEvent) {
  event.preventDefault();
  if (event.touches[0]) {
    const deltaY = startY.value - event.touches[0].clientY;
    const deltaPercentage = (deltaY / window.innerHeight) * 100;
    sheetHeight.value = Math.min(
      Math.max(initialHeight.value + deltaPercentage, 10),
      75
    );
  }
}

// Mouse event handlers
function startDragMouse(event: MouseEvent) {
  event.preventDefault();
  isDragging.value = true;
  startY.value = event.clientY;
  initialHeight.value = sheetHeight.value;
  
  document.addEventListener('mousemove', onDragMouse);
  document.addEventListener('mouseup', endDragMouse);
}

function onDragMouse(event: MouseEvent) {
  if (!isDragging.value) return;
  
  const deltaY = startY.value - event.clientY;
  const deltaPercentage = (deltaY / window.innerHeight) * 100;
  sheetHeight.value = Math.min(
    Math.max(initialHeight.value + deltaPercentage, 10),
    75
  );
}

function endDragMouse() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDragMouse);
  document.removeEventListener('mouseup', endDragMouse);
  snapToHeight();
}

function endDrag() {
  snapToHeight();
}

function snapToHeight() {
  // Optional: Snap to predefined heights
  if (sheetHeight.value < 33) {
    sheetHeight.value = 30; // Snap to default height
  } else if (sheetHeight.value > 50) {
    sheetHeight.value = 75; // Snap to maximum height
  }
}
</script>

<style>
.leaflet-container {
  height: 100%;
  display: block;
}

.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  overflow: hidden;
  z-index: 6001;
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

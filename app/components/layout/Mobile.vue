<template>
  <v-layout class="map-layout">
    <MapSidePanel temporary />

    <v-main class="map-main" :style="{ height: `${100 - sheetHeight}%` }">
      <Map class="fill-height">
        <template #top-left-controls>
          <v-btn
            icon
            size="small"
            class="menu-btn"
            title="Kaartlagen en legenda"
            aria-label="Kaartlagen en legenda openen"
            @click="menuOpen = true"
          >
            <v-icon>mdi-menu</v-icon>
          </v-btn>
        </template>
      </Map>
    </v-main>

    <div class="bottom-sheet" :style="{ height: `${sheetHeight}%` }">
      <div
        class="drag-handle"
        tabindex="0"
        role="button"
        :aria-pressed="isSheetExpanded"
        aria-controls="mobile-bottom-sheet-content"
        :aria-label="isSheetExpanded ? 'Onderpaneel inklappen' : 'Onderpaneel uitklappen'"
        @touchstart="startDrag"
        @touchmove="onDrag"
        @touchend="endDrag"
        @mousedown="startDragMouse"
        @keydown.enter.prevent="toggleSheetHeight"
        @keydown.space.prevent="toggleSheetHeight"
      >
        <div class="drag-indicator" />
      </div>
      <div id="mobile-bottom-sheet-content" ref="sheetContentRef" class="sheet-content">
        <NuxtPage />
      </div>
    </div>
  </v-layout>
</template>

<script setup lang="ts">
const {
  sheetHeight,
  sheetContentRef,
  startDrag,
  onDrag,
  endDrag,
  startDragMouse,
  setHeight,
} = useBottomSheet({
  defaultHeight: 50,
  minHeight: 20,
  maxHeight: 75,
  snapPoints: [40, 75],
});

const { open: menuOpen } = useMapMenu();
menuOpen.value = false;

const collapsedSheetHeight = 40;
const expandedSheetHeight = 75;
const isSheetExpanded = computed(() => sheetHeight.value >= expandedSheetHeight);

function toggleSheetHeight() {
  setHeight(isSheetExpanded.value ? collapsedSheetHeight : expandedSheetHeight);
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
  z-index: 6001 !important;
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

.drag-handle:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
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
.menu-btn {
  background: white !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3) !important;
}
</style>

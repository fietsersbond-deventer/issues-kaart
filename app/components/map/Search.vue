<template>
  <div
    class="d-flex align-center mb-1 bg-surface-container-high"
    style="width: fit-content; height: 40px; border-radius: 12px"
  >
    <ToolButton
      v-model="toolActive"
      :disabled="disabled"
      :tooltip-text="t('common.search')"
      class="click-stop elevation-0"
      icon="mdi-magnify"
      style="margin-top: 0 !important"
    />
    <v-expand-x-transition>
      <v-card
        v-show="toolActive"
        class="click-stop"
        height="40px"
        width="600px"
        style="border: none"
      >
        <Gazetteer
          v-model="location"
          :disabled="disabled"
          style="z-index: -1; height: 40px"
          :search-params="searchParams"
          hide-details
          density="compact"
        />
      </v-card>
    </v-expand-x-transition>
  </div>
</template>

<script setup lang="ts">

// props
const
  defineProps<{
    zoomAnimation?: boolean;
    active?: boolean;
    disabled?: boolean;
  }>(),
  {
    zoomAnimation: true,
    active: false,
    disabled: false,
  },
);

const emits = defineEmits<{
  (event: "update:active", value: boolean): void;
}>();

// Hide search result geometry and clear the current selection when the search bar is closed
watch(toolActive, (active) => {
  if (!active) {
    setVisible(false);
    setSelectedSearchResult(undefined);
    location.value = undefined;
  }
});

// Zoom to the detailed bounds calculated from the fetched feature geometry
// Expand the bounds by 20% so the feature has some visual padding
const BOUNDS_PADDING_FACTOR = 0.4;
watch(detailedBounds, (bounds) => {
  if (bounds) {
    const padX = bounds.width * BOUNDS_PADDING_FACTOR;
    const padY = bounds.height * BOUNDS_PADDING_FACTOR;
    const paddedBounds = createBounds(bounds.reference, [
      bounds.x - padX / 2,
      bounds.width + padX,
      bounds.y - padY / 2,
      bounds.height + padY,
    ]);
    updateCameraPositionBounds(
      paddedBounds,
      MIN_HEIGHT,
      HEIGHT_FACTOR_ADJUSTMENT,
      props.zoomAnimation,
    );
  }
});

function zoomToBounds(boundingBox: SearchResult["boundingbox"]) {
  if (!boundingBox) return;
  const minY = Math.min(boundingBox.south, boundingBox.north);
  const deltaY = Math.max(boundingBox.south, boundingBox.north) - minY;

  const minX = Math.min(boundingBox.west, boundingBox.east);
  const deltaX = Math.max(boundingBox.west, boundingBox.east) - minX;

  const bounds = createBounds(EPSG_4326, [minX, deltaX, minY, deltaY]);

  updateCameraPositionBounds(
    bounds,
    MIN_HEIGHT,
    HEIGHT_FACTOR_ADJUSTMENT,
    props.zoomAnimation,
  );
}

watch(location, (selected) => {
  if (!selected) {
    setSelectedSearchResult(undefined);
    return;
  }

  // Set the selected result for display on the map
  setSelectedSearchResult(toRaw(selected));

  let bbox = toRaw(selected).boundingbox;
  if (!bbox) {
    // if no bounding box is available, create a small bounding box around the location
    const { lat, lon } = toRaw(selected);
    const delta = 0.001; // ~100m, can be adjusted based on typical search result types
    bbox = {
      south: lat - delta,
      west: lon - delta,
      north: lat + delta,
      east: lon + delta,
    };
  }

  if (bbox) {
    zoomToBounds(bbox);
  }
});
</script>

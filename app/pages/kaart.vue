<template>
  <LayoutMobile v-if="mobile" />
  <LayoutDesktop v-else />
</template>

<script setup lang="ts">
const { mobile } = useDisplay();
useMapEventBus().provide();

// Initialize lock store for editors to receive lock status updates
// This ensures the WebSocket connection is established even on the main map page
useIssueLocks();

// Initialize the main issues store to ensure it subscribes to WebSocket before any updates arrive
// This prevents the "0 subscribers" issue where WebSocket connects before stores subscribe
useIssues({ fields: "id,title,color,geometry,imageUrl" });
</script>

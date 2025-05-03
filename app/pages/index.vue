<template>
  <div class="flex min-h-[calc(100vh-73px)]">
    <!-- Main map area -->
    <main class="flex-1">
      <Map />
    </main>
  </div>
</template>

<script setup lang="ts">
const reactiveFeature = new ReactiveFeature();

useMapEventBus().provide();
useEditableFeature().provide(reactiveFeature);
</script>

<style>
.leaflet-container {
  height: 100%;
}
</style>

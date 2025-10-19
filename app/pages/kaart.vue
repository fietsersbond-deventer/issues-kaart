<template>
  <ClientOnly>
    <LayoutMobile v-if="mobile" />
    <LayoutDesktop v-else />
  </ClientOnly>
</template>

<script setup lang="ts">
const { mobile } = useDisplay();
useMapEventBus().provide();
</script>

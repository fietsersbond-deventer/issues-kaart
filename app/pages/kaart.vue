<template>
  <LayoutMobile v-if="mobile" />
  <LayoutDesktop v-else />
</template>

<script setup lang="ts">
const { mobile } = useDisplay();
useMapEventBus().provide();
</script>

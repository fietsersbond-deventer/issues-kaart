<template>
  <LayoutDesktop v-if="!mobile" />
  <LayoutMobile v-else />
</template>

<script setup lang="ts">
const { mobile } = useVDisplay();
useMapEventBus().provide();
</script>

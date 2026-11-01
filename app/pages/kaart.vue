<template>
  <LayoutDesktop v-if="!mobileLayout" />
  <LayoutMobile v-else />
</template>

<script setup lang="ts">
const { mobile } = useVDisplay();
const mobileLayout = useState("kaart-mobile-layout", () => mobile.value);
watch(mobile, (value) => {
  mobileLayout.value = value;
});
onMounted(() => {
  mobileLayout.value = mobile.value;
});
const issuesStore = useIssues();
// zorg dat de pinia store in SSR geladen is
await callOnce("kaart-issues", () => issuesStore.load());
useMapEventBus().provide();
</script>

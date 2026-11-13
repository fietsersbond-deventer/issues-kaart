<template>
  <LayoutDesktop v-if="!mobileLayout" />
  <LayoutMobile v-else />
</template>

<script setup lang="ts">
const { mobile } = useVDisplay();
// Serialize the server's initial breakpoint decision so hydration starts with
// the same layout. Vuetify can update its client breakpoint during hydration,
// so runtime layout swaps are held until the page has mounted.
const mobileLayout = useState("kaart-mobile-layout", () => mobile.value);
const isMounted = ref(false);
const issuesStore = useIssues();

watch(mobile, (value) => {
  if (isMounted.value) mobileLayout.value = value;
});

// A client-only map cannot start its own server fetch. Wait here so issue data
// is already in Pinia before Nuxt serializes the page's hydration payload.
onServerPrefetch(() => issuesStore.load());

onMounted(() => {
  isMounted.value = true;
  mobileLayout.value = mobile.value;
  // Direct client-side navigation has no server-prefetch pass. On hydration,
  // isLoaded is already true from SSR, preventing a duplicate initial request.
  if (!issuesStore.isLoaded) void issuesStore.load();
});

useMapEventBus().provide();
</script>

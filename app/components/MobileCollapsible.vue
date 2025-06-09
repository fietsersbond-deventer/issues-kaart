<template>
  <div class="mobile-collapsible">
    <!-- Desktop view -->
    <div v-if="!mobile" class="desktop-content">
      <slot />
    </div>

    <!-- Mobile view -->
    <template v-else>
      <v-expansion-panels v-model="panelModel">
        <v-expansion-panel :text="title"> <slot /> </v-expansion-panel
      ></v-expansion-panels>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  /** The title shown in the toggle button (mobile only) */
  title: string;
  /** Whether to start expanded in mobile mode */
  defaultExpanded?: boolean;
}>();

const { mobile } = useDisplay();

// Using panel model for expansion state
const panelModel = ref(props.defaultExpanded ? 0 : null);
const expanded = computed(() => panelModel.value === 0);

// Emit expand/collapse events
const emit = defineEmits<{
  (e: "update:expanded", value: boolean): void;
  (e: "expand" | "collapse"): void;
}>();

// Watch expanded state and emit events
watch(expanded, (value) => {
  emit("update:expanded", value);
  if (value) {
    emit("expand");
  } else {
    emit("collapse");
  }
});

// Reset expanded state when switching between mobile/desktop
watch(mobile, (isMobile) => {
  if (!isMobile) {
    panelModel.value = null;
  }
});
</script>

<style scoped>
.mobile-collapsible {
  width: 100%;
  min-width: 200px;
}

.desktop-content {
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>

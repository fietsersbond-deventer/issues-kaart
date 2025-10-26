<template>
  <v-icon
    v-if="!showFallback"
    ref="iconRef"
    :icon="iconName"
    @error="handleIconError"
  />
</template>

<script setup lang="ts">
interface Props {
  icon: string;
  size?: string | number;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: "24px",
  color: "currentColor",
});

const iconRef = ref();
const showFallback = ref(false);
const isValidated = ref(false);

const iconName = computed(() => {
  // Ensure icon has mdi- prefix
  return props.icon.startsWith("mdi-") ? props.icon : `mdi-${props.icon}`;
});

// Validate icon availability after mount
onMounted(() => {
  nextTick(() => {
    validateIcon();
  });
});

// Re-validate when icon changes
watch(
  () => props.icon,
  () => {
    showFallback.value = false;
    isValidated.value = false;
    nextTick(() => {
      validateIcon();
    });
  }
);

function validateIcon() {
  if (typeof window === "undefined") return;

  // Create a test element to check if the icon renders
  const testElement = document.createElement("i");
  testElement.className = `mdi ${iconName.value.replace("mdi-", "mdi-")}`;
  testElement.style.position = "absolute";
  testElement.style.left = "-9999px";
  testElement.style.fontSize = "16px";

  document.body.appendChild(testElement);

  // Use a timeout to allow the icon to load
  setTimeout(() => {
    try {
      const computedStyle = window.getComputedStyle(testElement, "::before");
      const content = computedStyle.getPropertyValue("content");

      // Check if the icon has actual content
      const hasContent =
        content &&
        content !== "none" &&
        content !== '""' &&
        content !== "''" &&
        content !== "normal";

      if (!hasContent) {
        showFallback.value = true;
        // Emit event that icon failed to load
        emits("iconNotFound", iconName.value);
      }

      isValidated.value = true;
    } catch (error) {
      console.warn("Icon validation failed:", error);
      showFallback.value = true;
      emits("iconNotFound", iconName.value);
    } finally {
      // Clean up test element
      if (document.body.contains(testElement)) {
        document.body.removeChild(testElement);
      }
    }
  }, 100); // Small delay to ensure CSS is loaded
}

function handleIconError() {
  showFallback.value = true;
  emits("iconNotFound", iconName.value);
}

// Emit events
const emits = defineEmits<{
  iconNotFound: [iconName: string];
}>();

// Expose validation state for parent components
defineExpose({
  isValid: computed(() => isValidated.value && !showFallback.value),
  showingFallback: readonly(showFallback),
});
</script>

<style scoped>
/* No additional styles needed */
</style>

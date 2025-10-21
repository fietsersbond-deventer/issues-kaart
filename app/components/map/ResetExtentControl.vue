<template>
  <v-btn
    icon
    size="small"
    class="reset-extent-button"
    title="Toon alle onderwerpen"
    @click="resetExtent"
  >
    <v-icon>mdi-fit-to-page-outline</v-icon>
  </v-btn>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  reset: [];
}>();

function resetExtent() {
  emit("reset");
}
</script>

<style scoped>
.reset-extent-button {
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
</style>

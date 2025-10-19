<template>
  <OlCustomControl position="top-left">
    <div class="ol-reset-extent ol-control">
      <button type="button" title="Toon alle onderwerpen" @click="resetExtent">
        <v-icon size="18">mdi-fit-to-page-outline</v-icon>
      </button>
    </div>
  </OlCustomControl>
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
.ol-reset-extent {
  top: 3.5em;
  background-color: white;
  cursor: pointer !important;
}

.ol-reset-extent button {
  display: block;
  width: 1.375em;
  height: 1.375em;
  padding: 0;
  border: none;
  background-color: rgba(255, 255, 255, 0.4);
  color: black;
  font-size: 1.14em;
  /* cursor: pointer !important; */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.ol-reset-extent button:hover,
.ol-reset-extent button:focus {
  background-color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
}

.ol-reset-extent button:active {
  background-color: rgba(0, 60, 136, 0.7);
  color: white;
}
</style>

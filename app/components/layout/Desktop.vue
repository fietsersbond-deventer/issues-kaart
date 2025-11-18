<template>
  <v-layout class="desktop-layout">
    <v-main
      class="map-main"
      :style="{ width: `calc(100% - ${drawerWidth}px)` }"
    >
      <Map class="fill-height">
        <!-- Use default slot content for desktop -->
      </Map>
    </v-main>

    <v-navigation-drawer
      location="right"
      :width="drawerWidth"
      app
      disable-route-watcher
      persistent
    >
      <div class="navigation-content">
        <div class="main-content">
          <NuxtPage />
        </div>
      </div>
    </v-navigation-drawer>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const drawerWidth = ref(600);

const updateDrawerWidth = () => {
  drawerWidth.value = Math.min(window.innerWidth * 0.5, 600);
};

onMounted(() => {
  updateDrawerWidth();
  window.addEventListener("resize", updateDrawerWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateDrawerWidth);
});
</script>

<style scoped>
.desktop-layout {
  display: flex;
  flex-direction: row;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-main {
  transition: width 0.3s ease;
}
</style>

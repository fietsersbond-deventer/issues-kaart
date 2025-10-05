<template>
  <v-layout class="desktop-layout">
    <v-main class="map-main" :style="{ width: 'calc(100% - 600px)' }">
      <Map class="fill-height" />
    </v-main>

    <v-navigation-drawer
      location="right"
      width="600"
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

<template>
  <v-layout class="rounded rounded-md border" height="100%">
    <v-app-bar color="surface-variant">
      <v-app-bar-title>Application bar</v-app-bar-title>
      <v-spacer />
      <template v-if="status === 'authenticated'">
        <v-btn v-if="isAdmin" to="/admin/users" variant="text" prepend-icon="mdi-cog">
          Beheer
        </v-btn>
        <v-btn variant="text" prepend-icon="mdi-logout" @click="handleLogout">
          Uitloggen
        </v-btn>
      </template>
      <v-btn v-else to="/login" variant="text" prepend-icon="mdi-login">
        Login
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer>
      <v-list nav>
        <div class="absolute bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <Toolbar />
        </div>
      </v-list>
    </v-navigation-drawer>

    <v-main class="d-flex align-center justify-center" height="100%" fluid>
      <v-container class="fill-height">
        <v-sheet color="surface-light" class="fill-height d-flex" width="100%">
          <Map class="flex-grow-1" />
        </v-sheet>
      </v-container>
    </v-main>
    <v-navigation-drawer location="right" width="400" app>
      <NuxtPage />
    </v-navigation-drawer>
  </v-layout>
</template>

<script setup lang="ts">
import { useMapEventBus } from "~/composables/useMapEventBus";
import { useRoles } from "~/composables/useRoles";

const { status, signOut } = useAuth();
const { isAdmin } = useRoles();

useMapEventBus().provide();

const reactiveFeature = new ReactiveFeature();
useEditableFeature().provide(reactiveFeature);

async function handleLogout() {
  await signOut({ callbackUrl: "/" });
}
</script>

<style>
.leaflet-container {
  height: 100%;
}
</style>

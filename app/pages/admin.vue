<template>
  <v-layout>
    <v-navigation-drawer
      v-if="!isPrinting"
      permanent
      class="noprint"
      :width="256"
      :rail="mobile && !expanded"
    >
      <v-list v-if="mobile">
        <v-list-item
          :prepend-icon="expanded ? 'mdi-chevron-left' : 'mdi-menu'"
          :title="expanded ? 'Inklappen' : ''"
          :aria-label="expanded ? 'Menu inklappen' : 'Menu uitklappen'"
          @click="expanded = !expanded"
        />
      </v-list>
      <v-list @click="expanded = false">
        <v-list-item
          prepend-icon="mdi-palette"
          title="Categorieën"
          to="/admin/legends"
        />
        <v-list-item prepend-icon="mdi-tag" title="Tags" to="/admin/tags" />

        <v-list-item
          prepend-icon="mdi-text"
          title="Teksten"
          to="/admin/texts"
        />
      </v-list>
      <v-list @click="expanded = false">
        <v-list-item
          v-if="isAdmin"
          prepend-icon="mdi-account-group"
          title="Gebruikers"
          to="/admin/users"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <NuxtPage />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";

definePageMeta({
  navTitle: "Beheer",

  middleware: [
    "sidebase-auth",
    function (to) {
      if (to.path === "/admin") {
        return "/admin/legends";
      }
    },
  ],
});
useTitle("Beheer");
const { isAdmin } = useRoles();

const isPrinting = useMediaQuery("print");

// On mobile the menu collapses to an icon rail that can be expanded.
const { mobile } = useVDisplay();
const expanded = ref(false);
</script>

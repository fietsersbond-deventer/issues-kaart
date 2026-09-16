<template>
  <v-layout>
    <v-navigation-drawer
      v-if="!isPrinting"
      permanent
      class="noprint"
      :width="256"
    >
      <v-list>
        <v-list-item
          prepend-icon="mdi-file-document"
          title="Onderwerpen"
          to="/admin/issues"
        />
        <v-list-item prepend-icon="mdi-tag" title="Tags" to="/admin/tags" />
        <v-list-item
          prepend-icon="mdi-palette"
          title="Categorieën"
          to="/admin/legends"
        />
      </v-list>
      <v-list>
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
        return "/admin/issues";
      }
    },
  ],
});
useTitle("Beheer");
const { isAdmin } = useRoles();

const isPrinting = useMediaQuery("print");
</script>

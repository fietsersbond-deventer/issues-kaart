<template>
  <v-layout>
    <v-navigation-drawer permanent>
      <v-list>
        <v-list-item
          v-if="isAdmin"
          prepend-icon="mdi-account-group"
          title="Gebruikers"
          to="/admin/users"
        />
        <v-list-item
          prepend-icon="mdi-palette"
          title="Legenda"
          to="/admin/legends"
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
definePageMeta({
  title: "Beheer",
  // middleware: ["admin"],
});
const { isAdmin } = useRoles();
</script>

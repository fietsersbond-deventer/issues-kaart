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
          prepend-icon="mdi-file-document"
          title="Onderwerpen"
          to="/admin/issues"
        />
        <v-list-item
          prepend-icon="mdi-palette"
          title="Categorieën"
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
  navTitle: "Beheer",
  // middleware: ["admin"],

  // Add middleware to handle redirects from /admin
  middleware: [
    function (to) {
      if (to.path === "/admin") {
        const { isAdmin } = useRoles();
        return isAdmin.value ? "/admin/users" : "/admin/legends";
      }
    },
  ],
});
const { isAdmin } = useRoles();

// All redirects are now handled by the middleware
</script>

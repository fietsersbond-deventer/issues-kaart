<template>
  <v-layout>
    <v-app-bar color="primary" title="Beheer">
      <template #prepend>
        <v-btn icon="mdi-arrow-left" variant="text" to="/kaart" />
      </template>
    </v-app-bar>

    <v-navigation-drawer permanent>
      <v-list>
        <v-list-item
          prepend-icon="mdi-account-group"
          title="Gebruikers"
          to="/admin/users"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <slot />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});
</script>

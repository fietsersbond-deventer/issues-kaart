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

// Redirect to first available menu item when at root admin page
const route = useRoute();
const router = useRouter();

onMounted(() => {
  if (route.path === '/admin') {
    // Navigate to users if admin, otherwise to legends
    const firstPath = isAdmin ? '/admin/users' : '/admin/legends';
    router.replace(firstPath);
  }
});
</script>

<template>
  <v-app-bar color="surface-variant">
    <v-app-bar-title>Deventer Fietsersbond projecten</v-app-bar-title>
    <v-breadcrumbs :items="breadcrumbs" />
    <v-spacer />
    <template v-if="status === 'authenticated'">
      <v-btn
        v-if="isAdmin"
        to="/admin/users"
        variant="text"
        prepend-icon="mdi-cog"
      >
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
</template>

<script lang="ts" setup>
const { status, signOut } = useAuth();
const { isAdmin } = useRoles();
const { breadcrumbs } = useBreadcrumbs();

async function handleLogout() {
  await signOut({ callbackUrl: "/" });
}
</script>

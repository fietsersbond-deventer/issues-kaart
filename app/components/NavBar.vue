<template>
  <v-app-bar color="surface-variant">
    <v-app-bar-title>Deventer Fietsersbond projecten</v-app-bar-title>
    <v-breadcrumbs :items="breadcrumbs">
      <template #divider>
        <v-icon>mdi-chevron-right</v-icon>
      </template>
      </v-breadcrumbs>  
    <v-spacer />
    <template v-if="status === 'authenticated'">
      <v-btn to="/kaart/new" variant="text" prepend-icon="mdi-plus-circle"> 
        Nieuw Issue
      </v-btn>
      <v-btn to="/admin" variant="text" prepend-icon="mdi-cog"> Beheer </v-btn>
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
const { breadcrumbs } = useBreadcrumbs();

async function handleLogout() {
  await signOut({ callbackUrl: "/" });
}
</script>

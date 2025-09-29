<template>
  <v-app-bar>
    <v-img src="/fietsersbond-logo.svg" alt="Fietsersbond" max-height="40" />
    <v-breadcrumbs :items="breadcrumbs">
      <template #divider>
        <v-icon>mdi-chevron-right</v-icon>
      </template>
    </v-breadcrumbs>
    <v-spacer />
    <template v-if="status === 'authenticated'">
      <v-btn
        v-tooltip:top="'Nieuw onderwerp toevoegen'"
        to="/kaart/new"
        variant="text"
        icon="mdi-plus-circle"
      />
      <v-btn
        v-tooltip:top="'Beheer'"
        to="/admin"
        variant="text"
        icon="mdi-cog"
      />
      <v-btn
        v-tooltip:top="'Uitloggen'"
        variant="text"
        icon="mdi-logout"
        @click="handleLogout"
      />
    </template>
    <v-btn
      v-else
      v-tooltip:top="'Inloggen beheer'"
      to="/login"
      variant="text"
      icon="mdi-login"
    />
  </v-app-bar>
</template>

<script lang="ts" setup>
const { status, signOut } = useAuth();
const { breadcrumbs } = useBreadcrumbs();

async function handleLogout() {
  await signOut({ callbackUrl: "/" });
}
</script>

<style>
.v-breadcrumbs-item {
  font-size: 1.5rem;
  font-weight: 700;
}
</style>

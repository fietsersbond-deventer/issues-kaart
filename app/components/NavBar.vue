<template>
  <v-app-bar class="navbar">
    <NuxtLink to="/" class="d-flex align-center logo">
      <img
        src="/fietsersbond-logo.webp"
        alt="Fietsersbond"
        max-height="40"
        class="ml-4"
      />
      <div class="header-link ml-3">Fietsersbond Deventer onderwerpen</div>
    </NuxtLink>
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
    <template v-else>
      <v-btn
        v-tooltip:top="'Deventer Fietsersbond'"
        href="https://deventer.fietsersbond.nl/"
        variant="text"
        icon="mdi-home"
      />
      <v-btn
        v-tooltip:top="'Contact'"
        href="https://deventer.fietsersbond.nl/contact/contact-met-de-afdeling/"
        variant="text"
        icon="mdi-email"
      />
      <v-btn
        v-tooltip:top="'Inloggen beheer'"
        to="/login"
        variant="text"
        icon="mdi-login"
      />
    </template>
  </v-app-bar>
</template>

<script lang="ts" setup>
import { NuxtLink } from "#components";

const { status, signOut } = useAuth();

async function handleLogout() {
  await signOut({ callbackUrl: "/" });
}
</script>

<style>
.header-link {
  /* font-size: 1.5rem; */
  font-weight: 700;
  display: inline-block;
  color: black;
}

.logo {
  background-color: white;
  height: 100%;
  padding-right: 1em;
  max-width: 50%;
}

.navbar {
  background-color: rgb(255, 213, 3) !important;
}
</style>

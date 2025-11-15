<template>
  <v-app-bar class="navbar">
    <div class="navbar-ellipse" />
    <NuxtLink to="/" class="d-flex align-center logo">
      <img
        src="/fietsersbond-logo.webp"
        alt="Fietsersbond"
        max-height="40"
        class="ml-4"
      />
      <div class="header-link ml-3">{{ headerText }}</div>
    </NuxtLink>
    <v-spacer />

    <!-- Show online users when authenticated -->
    <template v-if="status === 'authenticated'">
      <OnlineUsers :avatar-size="28" :max-avatars="4" class="mr-4" />
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
        :v-tooltip:top="organizationTooltip"
        :href="organization.website"
        variant="text"
        icon="mdi-home"
      />
      <v-btn
        v-tooltip:top="'Contact'"
        :href="organization.contactUrl"
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
const { organization } = useRuntimeConfig().public;

const headerText = computed(() => {
  return `${organization.name} ${organization.shortName}`;
});

const organizationTooltip = computed(() => {
  return organization.name;
});

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
  line-height: 1;
}

.logo {
  background-color: white;
  height: 100%;
  padding-right: 1em;
  max-width: 50%;
  text-decoration: none;
}

.navbar {
  background-color: rgb(255, 213, 3) !important;
}

.navbar-ellipse {
  position: absolute;
  left: 69%;
  top: -30px;
  transform: translateX(-50%) translateY(-100px);
  width: 66vw;
  height: 200px;
  background: url("/ellipse.svg") no-repeat center top;
  background-size: cover;
  z-index: 0;
  opacity: 0;
  animation: ellipse-drop 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) 0.4s
    forwards;
}

@keyframes ellipse-drop {
  from {
    transform: translateX(-50%) translateY(-100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

@media (max-width: 600px) {
  .navbar-ellipse {
    display: none;
  }
}
</style>

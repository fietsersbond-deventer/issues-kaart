<template>
  <v-app-bar class="navbar" :class="{ 'navbar--mobile': mobile }">
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
    <v-btn
      v-tooltip:top="'Kaart'"
      :to="{ path: '/kaart', query: filterQuery }"
      variant="text"
      :density="mobile ? 'comfortable' : 'default'"
      aria-label="Ga naar kaart"
      icon="mdi-map"
    />
    <v-btn
      v-tooltip:top="'Lijst'"
      :to="{ path: '/lijst', query: listQuery }"
      variant="text"
      :density="mobile ? 'comfortable' : 'default'"
      aria-label="Ga naar lijst"
      icon="mdi-list-box-outline"
    />

    <template v-if="status === 'authenticated'">
      <OnlineUsers
        :avatar-size="28"
        :max-avatars="mobile ? 1 : 4"
        :class="mobile ? 'mr-1' : 'mr-4'"
      />
      <v-btn
        v-tooltip:top="'Nieuw onderwerp toevoegen'"
        to="/kaart/new"
        aria-label="Nieuw onderwerp toevoegen"
        variant="text"
        :density="mobile ? 'comfortable' : 'default'"
        icon="mdi-plus-circle"
      />
    </template>

    <!-- On mobile the secondary actions move into an overflow menu -->
    <v-menu v-if="mobile" location="bottom end">
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          variant="text"
          density="comfortable"
          icon="mdi-dots-vertical"
          aria-label="Meer"
        />
      </template>
      <v-list density="compact">
        <v-list-item
          v-for="action in secondaryActions"
          :key="action.title"
          :title="action.title"
          :prepend-icon="action.icon"
          :to="action.to"
          :href="action.href"
          @click="action.onClick?.()"
        />
      </v-list>
    </v-menu>
    <template v-else>
      <v-btn
        v-for="action in secondaryActions"
        :key="action.title"
        v-tooltip:top="action.title"
        :to="action.to"
        :href="action.href"
        variant="text"
        :icon="action.icon"
        :aria-label="action.title"
        @click="action.onClick?.()"
      />
    </template>
  </v-app-bar>
</template>

<script lang="ts" setup>
import { NuxtLink } from "#components";

const { status, signOut } = useAuth();
const filterQuery = useFilterQuery();
const { listQuery } = useListQuery();
const { getText } = useCachedTexts();
const { mobile } = useVDisplay();

const headerText = computed(() => {
  return getText("navbar.header")?.text ?? "";
});

const websiteUrl = computed(() => {
  return getText("navbar.websiteUrl")?.text ?? "";
});

const contactUrl = computed(() => {
  return getText("navbar.contactUrl")?.text ?? "";
});

async function handleLogout() {
  await signOut({ callbackUrl: "/" });
}

interface NavAction {
  title: string;
  icon: string;
  to?: string;
  href?: string;
  onClick?: () => void;
}

const secondaryActions = computed<NavAction[]>(() => {
  if (status.value === "authenticated") {
    return [
      { title: "Beheer", icon: "mdi-cog", to: "/admin" },
      { title: "Uitloggen", icon: "mdi-logout", onClick: handleLogout },
    ];
  }
  const actions: NavAction[] = [];
  if (websiteUrl.value) {
    actions.push({
      title: "Afdeling",
      icon: "mdi-home",
      href: websiteUrl.value,
    });
  }
  if (contactUrl.value) {
    actions.push({
      title: "Contact",
      icon: "mdi-email",
      href: contactUrl.value,
    });
  }
  actions.push({ title: "Inloggen beheer", icon: "mdi-login", to: "/login" });
  return actions;
});
</script>

<style>
.header-link {
  /* font-size: 1.5rem; */
  font-weight: 700;
  display: inline-block;
  color: black;
  line-height: 1;
}

a.v-btn {
  text-decoration: none;
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

.navbar--mobile .v-btn--icon {
  margin-inline: 2px;
}

@media (max-width: 600px) {
  .navbar-ellipse {
    display: none;
  }
}
</style>

<script setup lang="ts">
useSeoMeta({
  title: "Fietsersbond Deventer - Meldingen",
  description: "Meldingen op de kaart",
});
</script>

<template>
  <UApp>
    <!-- <UContainer>
      <header class="border-b border-gray-200 py-4">
        <UNavigationMenu>
          <template #brand>
            <NuxtLink to="/" class="text-xl font-bold"
              >Fietsersbond Deventer</NuxtLink
            >
          </template>
          <template #links>
            <div class="flex gap-4">
              <NuxtLink to="/">Kaart</NuxtLink>
            </div>
          </template>
          <template #right>
            <div class="flex items-center gap-4">
              <UButton to="/login" variant="ghost">Login</UButton>
            </div>
          </template>
        </UNavigationMenu>
      </header>
    </UContainer> -->
    <NuxtPage />
  </UApp>
</template>

<style>
html,
body {
  height: 100%;
}
</style>

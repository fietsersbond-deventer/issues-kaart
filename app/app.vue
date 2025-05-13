<script setup lang="ts">
useSeoMeta({
  title: "Fietsersbond Deventer - Projecten",
  description: "Projecten op de kaart",
});
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator />

    <v-app>
      <NavBar />
      <v-main>
        <NuxtErrorBoundary>
          <!-- You use the default slot to render your content -->
          <template #error="{ error, clearError }">
            You can display the error locally here: {{ error }}
            <button @click="clearError">This will clear the error.</button>
          </template>
        </NuxtErrorBoundary>

        <NuxtPage />
      </v-main>
    </v-app>
  </NuxtLayout>
</template>

<style>
html,
body {
  height: 100%;
}
</style>

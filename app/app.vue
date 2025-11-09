<script setup lang="ts">
import { useSnackbar } from "~/composables/useSnackbar";

const { snackbar } = useSnackbar();
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

        <v-snackbar
          v-model="snackbar.show"
          :color="snackbar.color"
          :timeout="snackbar.timeout"
        >
          {{ snackbar.text }}
        </v-snackbar>
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

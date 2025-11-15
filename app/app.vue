<script setup lang="ts">
import { useSnackbar } from "~/composables/useSnackbar";

const { snackbar } = useSnackbar();

// Initialize issue notifications
useIssueNotifications();
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

        <!-- Persistent alert for delete notifications -->
        <v-alert
          v-if="snackbar.timeout === -1"
          v-model="snackbar.show"
          :type="snackbar.color === 'info' ? 'info' : 'warning'"
          closable
          class="position-fixed"
          style="bottom: 16px; left: 16px; max-width: 400px; z-index: 1000"
        >
          {{ snackbar.text }}
        </v-alert>

        <!-- Regular snackbar for auto-dismiss notifications -->
        <v-snackbar
          v-if="snackbar.timeout !== -1"
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

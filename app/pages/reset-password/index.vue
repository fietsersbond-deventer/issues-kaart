<template>
  <v-layout>
    <v-main>
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6" lg="4">
            <v-card class="pa-8">
              <h1 class="text-h4 mb-6 text-center">Wachtwoord vergeten</h1>

              <v-form @submit.prevent="handleSubmit">
                <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
                  {{ error }}
                </v-alert>

                <v-alert
                  v-if="success"
                  type="success"
                  variant="tonal"
                  class="mb-4"
                >
                  {{ success }}
                </v-alert>

                <v-text-field
                  v-model="email"
                  label="E-mailadres"
                  type="email"
                  required
                  :disabled="isLoading"
                  autocomplete="email"
                  prepend-inner-icon="mdi-email"
                />

                <v-btn
                  type="submit"
                  :loading="isLoading"
                  block
                  color="primary"
                  size="large"
                  class="mb-3"
                >
                  Wachtwoord herstellen
                </v-btn>

                <v-btn
                  variant="text"
                  block
                  :disabled="isLoading"
                  @click="navigateTo('/login')"
                >
                  Terug naar login
                </v-btn>
              </v-form>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
const email = ref("");
const error = ref("");
const success = ref("");
const isLoading = ref(false);

async function handleSubmit() {
  error.value = "";
  success.value = "";
  isLoading.value = true;

  try {
    await $fetch("/api/auth/reset-password/request", {
      method: "POST",
      body: { email: email.value },
    });
    success.value =
      "Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een e-mail met instructies om je wachtwoord te resetten.";
    email.value = "";
  } catch (e) {
    console.error(e);
    error.value = "Er is een fout opgetreden. Probeer het later opnieuw.";
  } finally {
    isLoading.value = false;
  }
}
</script>

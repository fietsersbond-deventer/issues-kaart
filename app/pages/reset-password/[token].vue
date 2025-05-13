<template>
  <v-layout>
    <v-main>
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6" lg="4">
            <v-card class="pa-8">
              <h1 class="text-h4 mb-6 text-center">
                Nieuw wachtwoord instellen
              </h1>

              <v-form @submit.prevent="handleSubmit">
                <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
                  {{ error }}
                </v-alert>

                <PasswordInput
                  v-model="password"
                  label="Nieuw wachtwoord"
                  :disabled="isLoading"
                  @strength-change="handleStrengthChange"
                />

                <v-text-field
                  v-model="confirmPassword"
                  label="Bevestig wachtwoord"
                  type="password"
                  required
                  :disabled="isLoading"
                  :rules="[
                    (v) => v === password || 'Wachtwoorden komen niet overeen',
                  ]"
                  autocomplete="new-password"
                  prepend-inner-icon="mdi-lock"
                />

                <v-btn
                  type="submit"
                  :loading="isLoading"
                  block
                  color="primary"
                  size="large"
                  :disabled="!isValid"
                >
                  Wachtwoord wijzigen
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
const route = useRoute();

const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const isLoading = ref(false);
const isPasswordStrong = ref(false);

const isValid = computed(() => {
  return isPasswordStrong.value && password.value === confirmPassword.value;
});

function handleStrengthChange(strength: { score: number; isStrong: boolean }) {
  isPasswordStrong.value = strength.isStrong;
}

async function handleSubmit() {
  if (!isValid.value) return;

  error.value = "";
  isLoading.value = true;

  try {
    await $fetch("/api/auth/reset-password/confirm", {
      method: "POST",
      body: {
        token: route.params.token,
        password: password.value,
      },
    });

    // Redirect to login with success message
    await navigateTo("/login?reset=success");
  } catch (e) {
    console.error(e);
    error.value =
      "De link is ongeldig of verlopen. Vraag een nieuwe wachtwoord reset aan.";
  } finally {
    isLoading.value = false;
  }
}
</script>

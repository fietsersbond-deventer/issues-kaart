<template>
  <v-form @submit.prevent="handleSubmit">
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-text-field
      v-model="username"
      label="E-mailadres of gebruikersnaam"
      required
      :disabled="isLoading"
      autocomplete="username"
      prepend-inner-icon="mdi-account"
    />

    <v-text-field
      v-model="password"
      label="Wachtwoord"
      type="password"
      required
      :disabled="isLoading"
      autocomplete="current-password"
      prepend-inner-icon="mdi-lock"
    />

    <v-btn
      type="submit"
      :loading="isLoading"
      block
      color="primary"
      size="large"
    >
      Login
    </v-btn>
  </v-form>
</template>

<script setup lang="ts">
const username = ref("");
const password = ref("");
const error = ref("");
const isLoading = ref(false);

const { signIn } = useAuth();

async function handleSubmit() {
  error.value = "";
  isLoading.value = true;

  try {
    await signIn(
      { username: username.value, password: password.value },
      {
        callbackUrl: "/",
      }
    );
  } catch (e) {
    console.error(e);
    error.value = "Ongeldige gebruikersnaam of wachtwoord.";
  } finally {
    isLoading.value = false;
  }
}
</script>

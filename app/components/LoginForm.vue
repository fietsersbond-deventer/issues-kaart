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

    <PasswordInput
      v-model="password"
      label="Wachtwoord"
      :disabled="isLoading"
    />

    <v-btn
      type="submit"
      :loading="isLoading"
      block
      color="primary"
      size="large"
      class="mb-3"
    >
      Login
    </v-btn>

    <v-btn
      variant="text"
      block
      :disabled="isLoading"
      @click="navigateTo('/reset-password')"
    >
      Wachtwoord vergeten?
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

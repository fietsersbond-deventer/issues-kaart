<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div v-if="error" class="text-red-500">{{ error }}</div>

    <div>
      <label for="username" class="block">Gebruikersnaam</label>
      <input
        id="username"
        v-model="username"
        type="text"
        required
        class="w-full px-3 py-2 border rounded"
        autocomplete="username"
      />
    </div>

    <div>
      <label for="password" class="block">Wachtwoord</label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        class="w-full px-3 py-2 border rounded"
        autocomplet="password"
      />
    </div>

    <button
      type="submit"
      :disabled="isLoading"
      class="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {{ isLoading ? "Loading..." : "Login" }}
    </button>
  </form>
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
    await signIn({ username: username.value, password: password.value });
    navigateTo("/");
  } catch {
    error.value = "Invalid credentials";
  } finally {
    isLoading.value = false;
  }
}
</script>

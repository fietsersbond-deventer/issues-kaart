<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div v-if="error" class="text-red-500">{{ error }}</div>

    <div>
      <label for="username" class="block">Username</label>
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
      <label for="password" class="block">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        class="w-full px-3 py-2 border rounded"
        autocomplete="new-password"
      />
    </div>

    <div>
      <label for="confirmPassword" class="block">Confirm Password</label>
      <input
        id="confirmPassword"
        v-model="confirmPassword"
        type="password"
        required
        class="w-full px-3 py-2 border rounded"
        autocomplete="new-password"
      />
    </div>

    <button
      type="submit"
      :disabled="isLoading || !isValid"
      class="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {{ isLoading ? "Loading..." : "Register" }}
    </button>
  </form>
</template>

<script setup lang="ts">
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const isLoading = ref(false);

const isValid = computed(() => {
  return (
    password.value && password.value === confirmPassword.value && username.value
  );
});

async function handleSubmit() {
  error.value = "";
  isLoading.value = true;

  try {
    await $fetch("/api/auth/register", {
      method: "POST",
      body: { username: username.value, password: password.value },
    });

    // After successful registration, log the user in
    const { signIn } = useAuth();
    await signIn({ username: username.value, password: password.value });
    return navigateTo("/");
  } catch (e: any) {
    console.error(e);
    error.value = e.data?.message || "Registration failed";
  } finally {
    isLoading.value = false;
  }
}
</script>

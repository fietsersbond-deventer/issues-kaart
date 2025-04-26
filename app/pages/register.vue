<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
      <h1 class="text-2xl font-bold mb-6 text-center">Register</h1>
      <RegisterForm />
      <p class="mt-4 text-center">
        Already have an account?
        <NuxtLink to="/login" class="text-blue-500 hover:text-blue-600">
          Login
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

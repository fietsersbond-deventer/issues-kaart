<template>
  <div>
    <v-text-field
      v-model="password"
      :label
      :type="showPassword ? 'text' : 'password'"
      :disabled
      required
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      auto-complete="current-password"
      prepend-inner-icon="mdi-lock"
      @click:append-inner="showPassword = !showPassword"
    />
  </div>
</template>

<script setup lang="ts">
const password = defineModel<string>({ required: true });

defineProps<{
  label?: string;
  disabled?: boolean;
}>();

const showPassword = ref(false);
</script>

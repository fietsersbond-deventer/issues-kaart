<template>
  <div>
    <v-text-field
      v-model="localPassword"
      :label="label"
      :type="showPassword ? 'text' : 'password'"
      :disabled="disabled"
      required
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="showPassword = !showPassword"
      auto-complete="current-password"
      prepend-inner-icon="mdi-lock"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  label?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const localPassword = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const showPassword = ref(false);
</script>
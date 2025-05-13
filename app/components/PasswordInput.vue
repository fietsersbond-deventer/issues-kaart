<template>
  <div>
    <v-text-field
      v-model="localPassword"
      :label="label"
      :type="showPassword ? 'text' : 'password'"
      :rules="passwordRules"
      :error-messages="errorMessage"
      :disabled="disabled"
      :loading="checking"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="showPassword = !showPassword"
      @update:model-value="checkPassword"
    />
    
    <v-progress-linear
      v-if="!disableStrengthCheck && strength !== null"
      :model-value="(strength.score / 4) * 100"
      :color="strengthColor"
      height="8"
      rounded
      class="mb-2"
    />
    
    <div v-if="!disableStrengthCheck && strength && strength.feedback.warning" class="text-caption mb-2" :class="strengthTextColor">
      {{ strength.feedback.warning }}
    </div>
    
    <div v-if="!disableStrengthCheck && strength && strength.feedback.suggestions.length > 0" class="text-caption">
      <ul class="pl-4">
        <li v-for="(suggestion, index) in strength.feedback.suggestions" :key="index">
          {{ suggestion }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  label?: string;
  disabled?: boolean;
  disableStrengthCheck?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'strength-change': [value: { score: number; isStrong: boolean }];
}>();

const localPassword = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const showPassword = ref(false);
const checking = ref(false);
const strength = ref<null | {
  score: number;
  feedback: { warning: string | null; suggestions: string[] };
  isStrong: boolean;
}>(null);
const errorMessage = ref('');

const strengthColor = computed(() => {
  if (!strength.value) return '';
  const colors = ['error', 'error', 'warning', 'success', 'success'];
  return colors[strength.value.score];
});

const strengthTextColor = computed(() => {
  if (!strength.value) return '';
  const colors = ['text-error', 'text-error', 'text-warning', 'text-success', 'text-success'];
  return colors[strength.value.score];
});

const passwordRules = computed(() => [
  (_: string) => !!localPassword.value || 'Wachtwoord is verplicht',
  (_: string) => props.disableStrengthCheck || (strength.value?.isStrong ?? false) || 'Wachtwoord is niet sterk genoeg'
]);

async function checkPassword(password: string) {
  if (!password || props.disableStrengthCheck) {
    strength.value = null;
    return;
  }

  checking.value = true;
  errorMessage.value = '';

  try {
    const response = await $fetch<{
      score: number;
      feedback: { warning: string | null; suggestions: string[] };
      isStrong: boolean;
    }>('/api/auth/check-password', {
      method: 'POST',
      body: { password }
    });
    
    strength.value = response;
    emit('strength-change', {
      score: response.score,
      isStrong: response.isStrong
    });
  } catch (error) {
    console.error('Error checking password strength:', error);
    errorMessage.value = 'Kon wachtwoordsterkte niet controleren';
  } finally {
    checking.value = false;
  }
}
</script>
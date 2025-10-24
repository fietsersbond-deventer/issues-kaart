<template>
  <div>
    <v-text-field
      v-model="password"
      :label
      :type="showPassword ? 'text' : 'password'"
      :rules="passwordRules"
      :error-messages="errorMessage"
      :disabled
      :loading="checking"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      auto-complete="new-password"
      prepend-inner-icon="mdi-lock"
      @click:append-inner="showPassword = !showPassword"
      @update:model-value="checkPassword"
    />

    <v-progress-linear
      v-if="strength !== null"
      :model-value="(strength.score / 4) * 100"
      :color="strengthColor"
      height="8"
      rounded
      class="mb-2"
    />

    <div
      v-if="strength && strength.feedback.warning"
      class="text-caption mb-2"
      :class="strengthTextColor"
    >
      {{ strength.feedback.warning }}
    </div>

    <div
      v-if="strength && strength.feedback.suggestions.length > 0"
      class="text-caption"
    >
      <ul class="pl-4">
        <li
          v-for="(suggestion, index) in strength.feedback.suggestions"
          :key="index"
        >
          {{ suggestion }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const password = defineModel<string>({ required: true });

defineProps<{
  label?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "strength-change": [value: { score: number; isStrong: boolean }];
}>();

const showPassword = ref(false);
const checking = ref(false);
const strength = ref<null | {
  score: number;
  feedback: { warning: string | null; suggestions: string[] };
  isStrong: boolean;
}>(null);
const errorMessage = ref("");

const strengthColor = computed(() => {
  if (!strength.value) return "";
  const colors = ["error", "error", "warning", "success", "success"];
  return colors[strength.value.score];
});

const strengthTextColor = computed(() => {
  if (!strength.value) return "";
  const colors = [
    "text-error",
    "text-error",
    "text-warning",
    "text-success",
    "text-success",
  ];
  return colors[strength.value.score];
});

const passwordRules = computed(() => [
  (_: string) => !!password.value || "Wachtwoord is verplicht",
  (_: string) =>
    (strength.value?.isStrong ?? false) || "Wachtwoord is niet sterk genoeg",
]);

async function checkPassword(password: string) {
  if (!password) {
    strength.value = null;
    emit("strength-change", { score: 0, isStrong: false });
    return;
  }

  checking.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch<{
      score: number;
      feedback: { warning: string | null; suggestions: string[] };
      isStrong: boolean;
    }>("/api/auth/check-password", {
      method: "POST",
      body: { password },
    });

    strength.value = response;
    emit("strength-change", {
      score: response.score,
      isStrong: response.isStrong,
    });
  } catch (error) {
    console.error("Failed to check password strength:", error);
    errorMessage.value = "Kan wachtwoordsterkte niet controleren";
    emit("strength-change", { score: 0, isStrong: false });
  } finally {
    checking.value = false;
  }
}
</script>

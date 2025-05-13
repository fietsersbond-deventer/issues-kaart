<template>
  <v-form @submit.prevent="handleSubmit">
    <v-text-field
      v-model="form.username"
      label="Gebruikersnaam"
      required
    />
    <v-text-field
      v-model="form.name"
      label="Naam"
    />
    <v-select
      v-model="form.role"
      label="Rol"
      :items="roles"
      item-title="label"
      item-value="name"
      required
    />
    <PasswordInput
      v-if="!editMode"
      v-model="form.password"
      label="Wachtwoord"
      :disabled="loading"
      @strength-change="handlePasswordStrength"
    />
    <v-card-actions>
      <v-spacer />
      <v-btn
        :loading="loading"
        color="primary"
        type="submit"
        :disabled="!isValid"
      >
        {{ editMode ? 'Opslaan' : 'Toevoegen' }}
      </v-btn>
      <v-btn color="error" @click="$emit('cancel')">Annuleren</v-btn>
    </v-card-actions>
  </v-form>
</template>

<script setup lang="ts">
import type { User } from '~/types/User';
import { useRoles } from '~/composables/useRoles';

const props = defineProps<{
  user?: Pick<User, 'id' | 'username' | 'name' | 'role'>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [data: {
    username: string;
    name: string | null;
    role: string;
    password?: string;
  }];
  cancel: [];
}>();

const editMode = computed(() => !!props.user);
const { getAllRoles } = useRoles();
const roles = getAllRoles();

const form = ref({
  username: props.user?.username ?? '',
  name: props.user?.name ?? '',
  role: props.user?.role ?? 'user',
  password: ''
});

const isPasswordValid = ref(false);

const isValid = computed(() => {
  if (editMode.value) {
    return !!form.value.username;
  }
  return !!form.value.username && !!form.value.password && isPasswordValid.value;
});

function handlePasswordStrength(strength: { score: number; isStrong: boolean }) {
  isPasswordValid.value = strength.isStrong;
}

function handleSubmit() {
  if (!isValid.value) return;

  emit('submit', {
    username: form.value.username,
    name: form.value.name || null,
    role: form.value.role,
    ...(editMode.value ? {} : { password: form.value.password })
  });
}
</script>
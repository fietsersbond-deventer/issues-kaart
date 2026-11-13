<template>
  <v-dialog v-model="dialog" max-width="420px">
    <v-card>
      <v-card-title>Issue verwijderen</v-card-title>
      <v-card-text
        >Weet je zeker dat je "{{ title }}" wilt verwijderen?</v-card-text
      >
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="error"
          :loading="loading"
          :disabled="disabled"
          @click="emit('confirm')"
        >
          Verwijderen
        </v-btn>
        <v-btn :disabled="loading" @click="dialog = false"> Annuleren </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  { loading: false, disabled: false },
);
const emit = defineEmits<{ confirm: [] }>();
const dialog = defineModel<boolean>({ required: true });
</script>

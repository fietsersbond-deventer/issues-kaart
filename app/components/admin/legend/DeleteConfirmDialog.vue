<template>
  <v-dialog v-model="modelValue" max-width="500px">
    <v-card>
      <v-card-title class="text-h5"
        >{{ legend?.name }} verwijderen?</v-card-title
      >
      <v-card-text v-if="error">
        <v-alert density="compact" type="error" variant="outlined" class="mb-3">
          {{ error }}
        </v-alert>
        <div v-if="legend && usage[legend.id]?.used_by_issues.length > 0">
          <div class="text-subtitle-1 mb-2">
            Dit legenda item wordt gebruikt door de volgende meldingen:
          </div>
          <v-list density="compact">
            <v-list-item
              v-for="issue in usage[legend.id]?.used_by_issues || []"
              :key="issue.id"
              :to="`/kaart/${issue.id}`"
              class="px-0"
            >
              <v-list-item-title>{{ issue.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          v-if="!error"
          color="primary"
          variant="text"
          @click="confirmDelete"
        >
          Ja, verwijder
        </v-btn>
        <v-btn color="error" variant="text" @click="close">
          {{ error ? "Sluiten" : "Annuleren" }}
        </v-btn>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Legend } from "~~/server/database/schema";
import type { LegendUsage } from "~/composables/useLegends";

const modelValue = defineModel<boolean>("modelValue");

const props = defineProps<{
  legend: Legend | null;
  error: string;
  usage: LegendUsage;
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
}>();

function confirmDelete() {
  emit("confirm");
}

function close() {
  modelValue.value = false;
}
</script>

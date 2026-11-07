<template>
  <v-dialog v-model="dialog" max-width="420px">
    <v-card>
      <v-card-title>Laatst aangepast</v-card-title>
      <v-card-text>
        <v-progress-circular v-if="loading" indeterminate size="20" />
        <div v-else>{{ updatedByName || "Niet geregistreerd" }}</div>
        <div v-if="!loading" class="text-medium-emphasis">
          {{ formatUpdatedAt(updatedAt) }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialog = false">Sluiten</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean;
  updatedByName: string | null;
  updatedAt: string | null;
}>();
const dialog = defineModel<boolean>({ required: true });

function formatUpdatedAt(value: string | null) {
  if (!value) return "Datum niet geregistreerd";

  const timestamp = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(timestamp.getTime())) return "Datum niet geregistreerd";

  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}
</script>

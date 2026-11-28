<template>
  <div class="print-toolbar d-print-none">
    <v-btn
      variant="text"
      prepend-icon="mdi-arrow-left"
      :to="{ path: '/lijst', query: listQuery }"
    >
      Terug naar de lijst
    </v-btn>
    <v-chip-group
      v-model="columns"
      class="print-choice"
      multiple
      filter
      column
      aria-label="Kolommen"
    >
      <v-chip
        v-for="column in PRINT_COLUMNS"
        :key="column.value"
        :value="column.value"
        size="small"
        variant="outlined"
      >
        {{ column.title }}
      </v-chip>
    </v-chip-group>
    <v-btn-toggle
      v-model="orientation"
      class="print-choice"
      mandatory
      density="compact"
      variant="outlined"
      divided
      aria-label="Papierrichting"
    >
      <v-btn value="landscape" prepend-icon="mdi-crop-landscape" size="small">
        Liggend
      </v-btn>
      <v-btn value="portrait" prepend-icon="mdi-crop-portrait" size="small">
        Staand
      </v-btn>
    </v-btn-toggle>
    <v-spacer />
    <v-btn
      color="primary"
      prepend-icon="mdi-printer"
      :disabled="disabled"
      :loading="loading"
      @click="emit('print')"
    >
      Afdrukken / PDF opslaan
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import type { PrintColumn } from "~/composables/usePrintColumns";
import type { PrintOrientation } from "~/composables/usePrintOrientation";
import { PRINT_COLUMNS } from "~/composables/usePrintColumns";

const { disabled = false, loading = false } = defineProps<{
  disabled?: boolean;
  loading?: boolean;
}>();
const emit = defineEmits<{ print: [] }>();

const columns = defineModel<PrintColumn[]>("columns", { required: true });
const orientation = defineModel<PrintOrientation>("orientation", {
  required: true,
});

const { listQuery } = useListQuery();
</script>

<style scoped>
.print-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 16px;
}

/* Chosen columns and orientation in yellow, like the active page button. */
.print-choice :deep(.v-chip--selected),
.print-choice :deep(.v-btn--active) {
  background-color: var(--fietsersbond-geel);
  border-color: transparent;
  color: rgb(var(--v-theme-on-surface));
}

@media print {
  /* Vuetify's d-print-none has no !important and loses to display: flex above. */
  .print-toolbar {
    display: none;
  }
}
</style>

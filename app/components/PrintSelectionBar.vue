<template>
  <div class="print-selection-bar mb-4 d-print-none">
    <div class="print-selection-bar__content">
      <span class="print-selection-bar__count" aria-live="polite">
        {{ selectedCount }} geselecteerd
      </span>
      <v-btn
        variant="text"
        size="small"
        :loading="selectingAll"
        :disabled="totalItems === 0"
        @click="emit('selectAll')"
      >
        Alle {{ totalItems }} resultaten selecteren
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        :disabled="selectedCount === 0"
        @click="emit('clear')"
      >
        Selectie wissen
      </v-btn>
      <v-spacer />
      <v-btn variant="text" size="small" @click="emit('cancel')">
        Annuleren
      </v-btn>
      <v-btn
        color="primary"
        size="small"
        prepend-icon="mdi-printer"
        :disabled="selectedCount === 0"
        @click="emit('print')"
      >
        Afdrukken
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
const { selectingAll = false } = defineProps<{
  selectedCount: number;
  totalItems: number;
  selectingAll?: boolean;
}>();

const emit = defineEmits<{
  selectAll: [];
  clear: [];
  cancel: [];
  print: [];
}>();
</script>

<style scoped>
.print-selection-bar {
  padding: 8px 12px;
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}

.print-selection-bar__content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.print-selection-bar__count {
  font-weight: 600;
  margin-right: 8px;
}
</style>

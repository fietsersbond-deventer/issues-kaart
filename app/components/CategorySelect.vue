<template>
  <v-select
    v-model="legend_id"
    :items="legends"
    item-value="id"
    item-title="name"
    dense
    hide-details
    :rules="[(v) => !!v || 'Categorie is verplicht']"
    required
  >
    <template #selection="{ item: legend }">
      <div class="d-flex align-center" style="gap: 8px">
        <LegendIndicator :legend="legend" :size="20" />
        <span>{{ legend.name }}</span>
      </div>
    </template>

    <template #item="{ props: itemProps, item: legend }">
      <v-list-item v-bind="itemProps" :subtitle="legend.description || undefined">
        <template #prepend>
          <div class="me-2">
            <LegendIndicator :legend="legend" :size="20" />
          </div>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script lang="ts" setup>
import type { Legend } from "~~/shared/types/Legend";

const legend_id = defineModel<number | null>({ required: true });
const { legends } = defineProps<{ legends: Legend[] }>();
</script>

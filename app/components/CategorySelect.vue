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
        <LegendIndicator 
          :color="legend.raw.color"
          :icon="legend.raw.icon"
          :size="20"
        />
        <span>{{ legend.raw.name }}</span>
      </div>
    </template>

    <template #item="{ props: itemProps, item: legend }">
      <v-list-item v-bind="itemProps" :subtitle="legend.raw.description">
        <template #prepend>
          <div class="me-2">
            <LegendIndicator 
              :color="legend.raw.color"
              :icon="legend.raw.icon"
              :size="20"
            />
          </div>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script lang="ts" setup>
import type { Legend } from "~/types/Legend";

const legend_id = defineModel<number | null>({ required: true });
const { legends } = defineProps<{ legends: Legend[] }>();
</script>

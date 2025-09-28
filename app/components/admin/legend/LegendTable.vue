<template>
  <v-table>
    <thead>
      <tr>
        <th>Kleur</th>
        <th>Naam</th>
        <th>Omschrijving</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in legends" :key="item.id">
        <td>
          <div class="color-preview" :style="{ backgroundColor: item.color }" />
        </td>
        <td>{{ item.name }}</td>
        <td>{{ item.description }}</td>
        <td>
          <v-btn icon variant="text" size="small" @click="emit('edit', item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-tooltip :text="getUsageText(item)">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                icon
                variant="text"
                size="small"
                color="error"
                :class="hasUsage(item) ? 'disabled' : ''"
                v-bind="tooltipProps"
                @click="if (!hasUsage(item)) emit('delete', item);"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import type { Legend } from "~~/server/database/schema";
import type { LegendUsage } from "~/composables/useLegends";

const props = defineProps<{
  legends: Legend[];
  usage: LegendUsage;
}>();

const emit = defineEmits<{
  (e: "edit" | "delete", legend: Legend): void;
}>();

function hasUsage(item: Legend) {
  if (!item?.id) return false;
  return props.usage[item.id]?.usage_count > 0;
}

function getUsageText(item: Legend) {
  if (!item?.id) return "";
  const count = props.usage[item.id]?.usage_count;
  if (!count) return "";
  return `Dit legenda item wordt gebruikt`;
}
</script>

<style>
.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.disabled {
  opacity: 0.26;
}
</style>

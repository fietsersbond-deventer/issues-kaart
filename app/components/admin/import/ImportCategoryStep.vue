<template>
  <div>
    <p class="mb-4">
      <template v-if="categoryField">
        Koppel elke waarde van <strong>{{ categoryField }}</strong> aan een
        bestaande of nieuwe categorie. Vink waarden uit die je niet wilt
        importeren.
      </template>
      <template v-else>Kies de categorie voor alle objecten.</template>
    </p>
    <v-table density="compact">
      <thead>
        <tr>
          <th>Importeren</th>
          <th>Waarde</th>
          <th class="text-right">Objecten</th>
          <th class="category-column">Categorie</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.value">
          <td>
            <v-checkbox-btn
              v-model="row.selected"
              :aria-label="`${label(row.value)} importeren`"
            />
          </td>
          <td>{{ label(row.value) }}</td>
          <td class="text-right">{{ row.count }}</td>
          <td class="py-2">
            <v-select
              v-model="row.legendId"
              :items="categoryItems"
              :disabled="!row.selected"
              :aria-label="`Categorie voor ${label(row.value)}`"
              placeholder="Kies een categorie"
              density="compact"
              hide-details
            />
            <div
              v-if="row.selected && row.legendId === 'new'"
              class="d-flex ga-2 mt-2"
            >
              <v-text-field
                v-model="row.newName"
                label="Naam nieuwe categorie"
                density="compact"
                hide-details
              />
              <v-menu :close-on-content-click="false">
                <template #activator="{ props: menuProps }">
                  <v-btn
                    v-bind="menuProps"
                    :color="row.newColor"
                    :aria-label="`Kleur voor ${row.newName || label(row.value)}`"
                    icon="mdi-palette"
                    size="small"
                  />
                </template>
                <ColorPicker v-model="row.newColor" />
              </v-menu>
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>
    <v-alert v-if="problem" type="warning" variant="tonal" class="mt-4">
      {{ problem }}
    </v-alert>
    <div class="mt-4">
      <v-btn @click="emit('previous')">Vorige</v-btn>
      <v-btn
        color="primary"
        class="ml-2"
        :disabled="!!problem"
        @click="emit('next')"
      >
        Volgende
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Legend } from "~~/server/database/schema";
import type { ImportCategoryRow } from "~/types/ImportCategoryRow";
import ColorPicker from "~/components/admin/legend/ColorPicker.vue";

const { categoryField, categories = [] } = defineProps<{
  categoryField?: string;
  categories?: Pick<Legend, "id" | "name">[];
}>();
const rows = defineModel<ImportCategoryRow[]>("rows", { required: true });

const emit = defineEmits<{ previous: []; next: [] }>();

const categoryItems = computed(() => [
  ...categories.map(({ id, name }) => ({ title: name, value: id })),
  { title: "Nieuwe categorie…", value: "new" },
]);

function label(value: string) {
  if (!categoryField) return "Alle objecten";
  return value || "(leeg)";
}

const problem = computed(() => {
  const selected = rows.value.filter((row) => row.selected);
  if (!selected.length) return "Selecteer minstens één waarde.";
  const existing = new Set(
    categories.map(({ name }) => name.trim().toLowerCase()),
  );
  for (const row of selected) {
    if (row.legendId === undefined) {
      return `Kies een categorie voor "${label(row.value)}".`;
    }
    if (row.legendId !== "new") continue;
    const name = row.newName.trim();
    if (!name)
      return `Geef de nieuwe categorie voor "${label(row.value)}" een naam.`;
    if (existing.has(name.toLowerCase())) {
      return `Categorie "${name}" bestaat al; kies die in de lijst.`;
    }
  }
  return "";
});
</script>

<style scoped>
.category-column {
  min-width: 280px;
}
</style>

<template>
  <v-dialog v-model="modelValue" max-width="500px">
    <v-card>
      <v-card-title>
        <span>{{
          isEdit ? "Legend Item aanpassen" : "Nieuw Legenda Item"
        }}</span>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field v-model="editedItem.name" label="Naam" required />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="editedItem.description"
                label="Omschrijving"
              />
            </v-col>
            <v-col cols="12">
              <v-color-picker
                v-model="editedItem.color"
                show-swatches
                swatches-max-height="300px"
              />
            </v-col>
            <v-col cols="12">
              <v-expansion-panels>
                <v-expansion-panel title="Icoon (optioneel)">
                  <v-expansion-panel-text>
                    <IconSelector v-model="editedItem.icon" />
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="save"> Opslaan </v-btn>
        <v-btn color="error" variant="text" @click="close"> Annuleren </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Legend } from "~~/server/database/schema";

const modelValue = defineModel<boolean>("modelValue");

const { legend = undefined } = defineProps<{
  legend?: Legend;
}>();

const emit = defineEmits<{
  (e: "save", item: Partial<Legend>): void;
}>();

const defaultItem: Partial<Legend> = {
  name: "",
  description: "",
  color: "#2196F3",
  icon: null,
};

const editedItem = ref<Partial<Legend>>(
  legend ? { ...legend, icon: legend.icon || null } : { ...defaultItem }
);
const isEdit = computed(() => !!legend);

watch(
  () => legend,
  (newLegend) => {
    editedItem.value = newLegend
      ? { ...newLegend, icon: newLegend.icon || null }
      : { ...defaultItem };
  }
);

function save() {
  emit("save", editedItem.value);
}

function close() {
  modelValue.value = false;
}
</script>

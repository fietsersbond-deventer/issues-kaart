<template>
  <v-dialog v-model="modelValue" max-width="90%" persistent>
    <keep-alive>
      <v-card v-show="modelValue">
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
            <v-col cols="4">
              <h4 class="mb-3">Kleur</h4>
              <v-color-picker
                v-model="editedItem.color"
                show-swatches
                swatches-max-height="300px"
              />
            </v-col>
            <v-col cols="8">
              <h4 class="mb-3">Icoon (optioneel)</h4>
              <div class="mb-4">
                <IconSelector v-model="editedItem.icon" />
              </div>

              <!-- Preview section -->
              <div v-if="editedItem.icon" class="mt-4">
                <v-divider class="mb-4" />
                <h4 class="mb-2">Voorvertoning:</h4>
                <div class="d-flex align-center gap-4 flex-wrap">
                  <div class="text-caption">In legenda:</div>
                  <LegendIndicator :legend="editedItem" :size="24" />
                  <div class="text-caption">Op kaart:</div>
                  <img
                    v-if="editedItem.icon_data_url"
                    :src="editedItem.icon_data_url"
                    alt="Map icon preview"
                    style="width: 32px; height: 32px; border-radius: 50%"
                  >
                  <v-chip v-else color="grey" size="small">Genereren...</v-chip>
                </div>
              </div>
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
    </keep-alive>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Legend } from "~/types/Legend";
import {
  createIconCanvasDataUrl,
  createFallbackIconDataUrl,
} from "@/utils/iconCanvas";

const modelValue = defineModel<boolean>("modelValue");

const { legend = undefined } = defineProps<{
  legend?: Pick<
    Legend,
    "id" | "name" | "description" | "color" | "icon" | "icon_data_url"
  >;
}>();

const emit = defineEmits<{
  (e: "save", item: LegendFormData): void;
}>();

const defaultItem = {
  name: "",
  description: "",
  color: "#2196F3",
  icon: undefined as string | undefined,
  icon_data_url: undefined as string | undefined,
};

type LegendFormData = Pick<Legend, "name" | "description" | "color"> & {
  icon?: string;
  icon_data_url?: string;
};

const editedItem = ref<LegendFormData>(
  legend
    ? {
        name: legend.name,
        description: legend.description,
        color: legend.color,
        icon: legend.icon,
        icon_data_url: legend.icon_data_url,
      }
    : { ...defaultItem }
);
const isEdit = computed(() => !!legend);

// Watch for changes to icon or color and regenerate canvas
watch(
  [() => editedItem.value.icon, () => editedItem.value.color],
  async ([newIcon, newColor]) => {
    if (newIcon && newColor) {
      try {
        const dataUrl = await createIconCanvasDataUrl(newIcon, newColor);
        editedItem.value.icon_data_url = dataUrl;
      } catch (error) {
        console.warn("Failed to generate icon canvas, using fallback:", error);
        editedItem.value.icon_data_url = createFallbackIconDataUrl(newColor);
      }
    } else {
      editedItem.value.icon_data_url = undefined;
    }
  },
  { immediate: true }
);

watch(
  () => legend,
  (newLegend) => {
    if (newLegend) {
      editedItem.value = { ...newLegend, icon: newLegend.icon || undefined };
    } else {
      editedItem.value = { ...defaultItem };
    }
  },
  { immediate: true }
);

function save() {
  emit("save", editedItem.value);
}

function close() {
  modelValue.value = false;
}
</script>

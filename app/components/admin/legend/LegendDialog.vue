<template>
  <v-dialog v-model="modelValue" max-width="90%">
    <keep-alive>
      <v-card v-show="modelValue">
        <v-card-title>
          <span>{{
            isEdit ? "Legenda item aanpassen" : "Nieuw Legenda item"
          }}</span>
        </v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="save"> Opslaan </v-btn>
          <v-btn color="error" variant="text" @click="close"> Annuleren </v-btn>
        </v-card-actions>

        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="6">
                <v-text-field v-model="editedItem.name" label="Naam" required />
              </v-col>
              <v-col cols="6">
                <div class="text-subtitle-2 mb-2">Omschrijving</div>
                <RichTextEditor
                  ref="richTextEditorRef"
                  v-model="editedItem.description"
                  :sanitize-options="sanitizeOptions"
                  aria-label="Omschrijving"
                />
              </v-col>
              <v-col cols="4">
                <h4 class="mb-3">Kleur</h4>
                <ColorPicker v-model="editedItem.color" />
              </v-col>
              <v-col cols="8">
                <h4 class="mb-3">Icoon</h4>
                <!-- Preview section -->
                <div v-if="editedItem.icon" class="mb-4">
                  <div class="d-flex align-center gap-4 flex-wrap">
                    <img
                      v-if="editedItem.icon_data_url"
                      :src="editedItem.icon_data_url"
                      alt="Map icon preview"
                      style="width: 36px; height: 36px; border-radius: 50%"
                    />
                    <v-chip v-else color="grey" size="small"
                      >Genereren...</v-chip
                    >
                    <v-chip
                      class="ml-3"
                      :closable="true"
                      @click:close="editedItem.icon = undefined"
                    >
                      {{ editedItem.icon }}
                    </v-chip>
                  </div>
                </div>

                <div class="mb-4">
                  <IconSelector
                    v-model="editedItem.icon"
                    :preview-color="editedItem.color"
                  />
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
import type { Legend } from "~~/shared/types/Legend";
import type { SanitizedHTML } from "~~/shared/types/SanitizedHTML";
import RichTextEditor from "~/components/RichTextEditor.vue";
import ColorPicker from "~/components/admin/legend/ColorPicker.vue";
import { DEFAULT_CATEGORY_COLOR } from "~~/shared/utils/categoryColors";
import { sanitizeDescriptionOptions } from "~~/shared/utils/sanitizeDescriptionOptions";
import {
  createIconCanvasDataUrl,
  createFallbackIconDataUrl,
} from "~/utils/iconCanvas";

const modelValue = defineModel<boolean>("modelValue");
const sanitizeOptions = sanitizeDescriptionOptions();

const { legend = undefined } = defineProps<{
  legend?: Pick<
    Legend,
    "id" | "name" | "description" | "color" | "icon" | "icon_data_url"
  >;
}>();

const emit = defineEmits<{
  (e: "save", item: LegendFormData): void;
}>();

type LegendFormData = {
  name: string;
  description: SanitizedHTML;
  color: string;
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
    : {
        name: "",
        description: "" as SanitizedHTML,
        color: DEFAULT_CATEGORY_COLOR,
        icon: undefined as string | undefined,
        icon_data_url: undefined as string | undefined,
      },
);
const richTextEditorRef = ref<InstanceType<typeof RichTextEditor> | null>(null);
const isEdit = computed(() => !!legend);

async function setIcon() {
  if (editedItem.value.icon && editedItem.value.color) {
    try {
      const dataUrl = await createIconCanvasDataUrl(
        editedItem.value.icon,
        editedItem.value.color,
      );
      editedItem.value.icon_data_url = dataUrl;
    } catch (error) {
      console.warn("Failed to generate icon canvas, using fallback:", error);
      editedItem.value.icon_data_url = createFallbackIconDataUrl(
        editedItem.value.color,
      );
    }
  } else {
    editedItem.value.icon_data_url = undefined;
  }
}

// Watch for changes to icon and regenerate using canvas (the working approach)
watch([() => editedItem.value.icon, () => editedItem.value.color], setIcon, {
  immediate: true,
});

watch(
  () => legend,
  (newLegend) => {
    if (newLegend) {
      editedItem.value = { ...newLegend, icon: newLegend.icon || undefined };
    } else {
      editedItem.value = {
        name: "",
        description: "" as SanitizedHTML,
        color: DEFAULT_CATEGORY_COLOR,
        icon: undefined as string | undefined,
        icon_data_url: undefined as string | undefined,
      };
    }
  },
  { immediate: true },
);

async function save() {
  // Sanitize the description before saving
  if (richTextEditorRef.value) {
    richTextEditorRef.value.sanitize();
  }
  await setIcon();
  emit("save", editedItem.value);
}

function close() {
  modelValue.value = false;
}
</script>

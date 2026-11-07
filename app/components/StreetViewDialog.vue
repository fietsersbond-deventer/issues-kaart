<template>
  <v-dialog v-model="isOpen" max-width="600">
    <v-card>
      <v-card-title>Street View toevoegen</v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-2">
          Plak hier een Street View link (gebruik de Deel-knop in Google Maps
          terwijl je in Street View staat). Gewone kaartlocaties worden niet
          ondersteund.
        </p>
        <v-text-field
          v-model.trim="streetViewUrl"
          label="Street View link"
          :disabled="isParsing || !!parsedPreview"
          :error-messages="parseError ? [parseError] : []"
          spellcheck="false"
          @keydown.enter.prevent="fetchStreetViewPreview"
        />
        <div v-if="parsedPreview" class="text-center mt-2">
          <img
            :src="parsedPreview.previewDataUrl"
            alt="Street View voorvertoning"
            class="streetview-dialog-preview"
          >
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Annuleren</v-btn>
        <v-btn
          v-if="!parsedPreview"
          color="primary"
          variant="flat"
          :loading="isParsing"
          :disabled="!streetViewUrl.trim() || isParsing"
          @click="fetchStreetViewPreview"
        >
          Ophalen
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="flat"
          @click="insert"
        >
          Invoegen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { StreetViewEmbedValue } from "~/utils/streetViewEmbedBlot";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  insert: [preview: StreetViewEmbedValue];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val),
});

const { token } = useAuth();
const authHeaders = computed(() => {
  if (!token.value) return undefined;
  const cleanToken = token.value.replace(/^Bearer\s+/i, "");
  return { Authorization: `Bearer ${cleanToken}` };
});

const streetViewUrl = ref("");
const isParsing = ref(false);
const parseError = ref("");
const parsedPreview = ref<StreetViewEmbedValue | null>(null);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      streetViewUrl.value = "";
      parseError.value = "";
      parsedPreview.value = null;
    }
  },
);

function close() {
  isOpen.value = false;
}

async function fetchStreetViewPreview() {
  const url = streetViewUrl.value.trim();
  if (!url || isParsing.value) return;

  isParsing.value = true;
  parseError.value = "";
  try {
    parsedPreview.value = await $fetch<StreetViewEmbedValue>(
      "/api/streetview/parse",
      {
        method: "POST",
        body: { url },
        headers: authHeaders.value,
      },
    );
  } catch (error) {
    parsedPreview.value = null;
    const fetchError = error as { data?: { message?: string } };
    parseError.value =
      fetchError?.data?.message ?? "Kon de Street View link niet verwerken";
  } finally {
    isParsing.value = false;
  }
}

function insert() {
  if (!parsedPreview.value) return;
  emit("insert", parsedPreview.value);
  close();
}
</script>

<style scoped>
.streetview-dialog-preview {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
}
</style>

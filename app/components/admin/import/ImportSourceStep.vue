<template>
  <div>
    <p class="mb-4">
      Kies een GeoJSON-, KML- of KMZ-bestand van maximaal 25 MB. Een export van
      Google My Maps is een KMZ-bestand. Het bestand wordt in de browser
      ingelezen; er wordt nog niets opgeslagen.
    </p>
    <v-file-input
      label="Bestand"
      accept=".geojson,.json,.kml,.kmz"
      prepend-icon="mdi-file-upload"
      :loading="loading"
      :error-messages="error"
      @update:model-value="read"
    />
    <v-alert v-if="fileName && featureCount !== null" type="info" class="mb-4">
      {{ fileName }}: {{ featureCount }} objecten met een geometrie.
    </v-alert>
    <v-btn color="primary" :disabled="!featureCount" @click="emit('next')">
      Volgende
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import type { ImportFile } from "~/utils/readImportFile";

const { fileName = "", featureCount = null } = defineProps<{
  fileName?: string;
  featureCount?: number | null;
}>();

const emit = defineEmits<{
  loaded: [file: ImportFile, fileName: string];
  next: [];
}>();

const loading = ref(false);
const error = ref("");

async function read(value: File | File[] | null | undefined) {
  const file = Array.isArray(value) ? value[0] : value;
  error.value = "";
  if (!file) return;
  loading.value = true;
  try {
    emit("loaded", await readImportFile(file), file.name);
  } catch (readError) {
    error.value =
      readError instanceof Error ? readError.message : "Inlezen mislukt";
  } finally {
    loading.value = false;
  }
}
</script>

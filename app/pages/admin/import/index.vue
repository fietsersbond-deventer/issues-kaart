<template>
  <div>
    <h1 class="text-h4 mb-4">Importeren</h1>

    <div v-if="result">
      <v-alert type="success" class="mb-4">
        {{ result.issues }} onderwerpen geïmporteerd. Ze hebben allemaal de tag
        <strong>{{ result.tag }}</strong
        >, zodat je ze later terugvindt.
      </v-alert>
      <h3 class="text-subtitle-1 mb-1">Verslag</h3>
      <v-list density="compact" class="mb-4">
        <v-list-item
          prepend-icon="mdi-map-marker-multiple"
          :title="`${result.issues} onderwerpen aangemaakt`"
        />
        <v-list-item
          prepend-icon="mdi-palette"
          :title="`${result.legends} nieuwe categorieën`"
        />
        <v-list-item
          prepend-icon="mdi-image"
          :title="`${result.issuesWithImage} onderwerpen met afbeelding, ${result.issues - result.issuesWithImage} zonder`"
          :subtitle="`${result.images} afbeeldingen opgeslagen`"
        />
        <v-list-item
          v-if="skippedImages"
          prepend-icon="mdi-image-off"
          :title="`${skippedImages} afbeeldingen overgeslagen omdat het verwerken mislukte`"
        />
        <v-list-item
          v-if="result.removedImages"
          prepend-icon="mdi-alert"
          base-color="warning"
          :title="`${result.removedImages} afbeeldingen verwijderd bij het opschonen van de HTML`"
        />
      </v-list>
      <!-- A button, not a link: the global link color would hide its text. -->
      <v-btn color="primary" @click="showOnMap"> Bekijk op de kaart </v-btn>
      <v-btn class="ml-2" @click="restart">Nieuwe import</v-btn>
    </div>

    <v-stepper
      v-else
      v-model="step"
      :items="['Bestand', 'Instellingen', 'Categorieën', 'Importeren']"
      hide-actions
      flat
    >
      <template #[`item.1`]>
        <AdminImportSourceStep
          :file-name="fileName"
          :feature-count="collection ? featureCount : null"
          @loaded="onLoaded"
          @next="step = 2"
        />
      </template>
      <template #[`item.2`]>
        <AdminImportSettingsStep
          v-model:settings="settings"
          :fields="fields"
          @previous="step = 1"
          @next="step = 3"
        />
      </template>
      <template #[`item.3`]>
        <AdminImportCategoryStep
          v-model:rows="rows"
          :category-field="settings.categoryField ?? undefined"
          :categories="categories ?? []"
          @previous="step = 2"
          @next="step = 4"
        />
      </template>
      <template #[`item.4`]>
        <AdminImportConfirmStep
          v-model:skip-failed="skipFailed"
          :issue-count="preview.issues.length"
          :new-category-count="newCategoryCount"
          :images="images"
          :is-downloading="isDownloading"
          :importing="importing"
          :error="preview.error || importError"
          @previous="step = 3"
          @retry="retryFailed"
          @import="runImport"
        />
      </template>
    </v-stepper>
  </div>
</template>

<script setup lang="ts">
import type { FeatureCollection } from "geojson";
import type {
  CategoryMappings,
  ImportResult,
  ImportSettings,
} from "~~/shared/types/GeojsonImport";
import type { ImportCategoryRow } from "~/types/ImportCategoryRow";
import { KMZ_IMAGE_PREFIX, type ImportFile } from "~/utils/readImportFile";
import {
  buildImportIssues,
  findImageSources,
  listCategoryValues,
  listImportFields,
  replaceImageSources,
} from "~~/shared/utils/geojsonImport";
import { defaultCategoryColor } from "~~/shared/utils/categoryColors";

definePageMeta({
  middleware: [
    "sidebase-auth",
    function () {
      const { isAdmin } = useRoles();
      return isAdmin.value || "/admin";
    },
  ],
});
useTitle("Importeren");

const categoriesStore = useCategories();
const { categories } = storeToRefs(categoriesStore);
const { importIssues } = useImportApi();
const {
  images,
  failed,
  isDownloading,
  download,
  retryFailed,
  replacements,
  reset: resetImages,
} = useImportImages();

const step = ref(1);
const collection = shallowRef<FeatureCollection | null>(null);
// Not reactive: the bytes of KMZ images are only read when uploading.
let kmzImages: ImportFile["images"] = new Map();
const fileName = ref("");
const settings = ref<ImportSettings>({
  title: "",
  description: "",
  fields: [],
});
const rows = ref<ImportCategoryRow[]>([]);
const skipFailed = ref(false);
const importing = ref(false);
const importError = ref("");
const result = ref<ImportResult | null>(null);
/** Failed images the admin chose to import without, for the report. */
const skippedImages = ref(0);

const fields = computed(() =>
  collection.value ? listImportFields(collection.value) : [],
);
const featureCount = computed(
  () =>
    collection.value?.features.filter((feature) => feature.geometry).length ??
    0,
);

function onLoaded(loaded: ImportFile, name: string) {
  collection.value = loaded.collection;
  kmzImages = loaded.images;
  fileName.value = name;
  const names = new Set(fields.value.map(({ name: field }) => field));
  // Sensible defaults for KML/KMZ; the admin can change every choice.
  const titleField = names.has("name") ? "name" : undefined;
  const htmlField = names.has("description") ? "description" : undefined;
  const categoryField = names.has("folder") ? "folder" : undefined;
  settings.value = {
    title: name.replace(/\.[^.]+$/, ""),
    description: "",
    titleField,
    htmlField,
    categoryField,
    fields: [...names],
  };
  rows.value = [];
  resetImages();
  skipFailed.value = false;
}

// Rebuild the category rows when the file or category field changes, keeping
// earlier choices for values that are still present.
watch(
  [collection, () => settings.value.categoryField],
  ([loaded, categoryField]) => {
    if (!loaded) return;
    const previous = new Map(rows.value.map((row) => [row.value, row]));
    rows.value = listCategoryValues(loaded, categoryField ?? undefined).map(
      ({ value, count }, index) =>
        previous.get(value) ?? {
          value,
          count,
          selected: true,
          legendId: undefined,
          newName: value,
          newColor: defaultCategoryColor(index),
        },
    );
  },
);

const mappings = computed<CategoryMappings>(() => {
  const result: CategoryMappings = {};
  for (const row of rows.value) {
    if (!row.selected || row.legendId === undefined) continue;
    result[row.value] =
      row.legendId === "new"
        ? { name: row.newName.trim(), color: row.newColor }
        : { legend_id: row.legendId };
  }
  return result;
});

const newCategoryCount = computed(
  () =>
    new Set(
      Object.values(mappings.value)
        .filter((target) => "name" in target)
        .map((target) => (target as { name: string }).name.toLowerCase()),
    ).size,
);

const preview = computed(() => {
  if (step.value !== 4 || !collection.value) return { issues: [], error: "" };
  try {
    return {
      issues: buildImportIssues(
        collection.value,
        settings.value,
        mappings.value,
      ),
      error: "",
    };
  } catch (error) {
    return {
      issues: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

watch(step, (current) => {
  importError.value = "";
  if (current !== 4) return;
  // Remote images and images from the KMZ archive.
  const sources = new Set(
    preview.value.issues.flatMap((issue) =>
      findImageSources(issue.description).filter(
        (source) =>
          source.startsWith(KMZ_IMAGE_PREFIX) || /^https?:\/\//i.test(source),
      ),
    ),
  );
  void download([...sources], kmzImages);
});

/** The collection with images in the HTML field replaced by server references. */
function collectionWithImages(): FeatureCollection {
  const loaded = collection.value!;
  const htmlField = settings.value.htmlField;
  if (!htmlField || !images.value.length) return loaded;
  const sources = replacements();
  return {
    ...loaded,
    features: loaded.features.map((feature) => {
      const html = feature.properties?.[htmlField];
      if (typeof html !== "string") return feature;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          [htmlField]: replaceImageSources(html, sources),
        },
      };
    }),
  };
}

async function runImport() {
  importing.value = true;
  importError.value = "";
  try {
    skippedImages.value = failed.value.length;
    result.value = await importIssues({
      geojson: collectionWithImages(),
      settings: settings.value,
      mappings: mappings.value,
      fileName: fileName.value,
    });
    await categoriesStore.refresh();
  } catch (error) {
    importError.value =
      (error as { data?: { message?: string } }).data?.message ??
      (error instanceof Error ? error.message : "Importeren mislukt");
  } finally {
    importing.value = false;
  }
}

function showOnMap() {
  return navigateTo({ path: "/", query: { tag: result.value!.tag } });
}

function restart() {
  collection.value = null;
  kmzImages = new Map();
  fileName.value = "";
  rows.value = [];
  resetImages();
  result.value = null;
  step.value = 1;
}
</script>

<template>
  <div style="max-width: 1000px">
    <h1 class="text-h4 mb-4">GeoJSON importeren</h1>
    <p class="mb-4">
      Upload GeoJSON in WGS84 of laad de Plus- en Hoofdnettenkaart van
      Amsterdam. Controleer de groepen en aantallen voordat je importeert. Elk
      object wordt een bewerkbare melding; meervoudige geometrieën worden
      opgesplitst. Opnieuw importeren maakt nieuwe meldingen.
    </p>
    <v-btn
      class="mb-4"
      :loading="loading"
      :disabled="loading"
      @click="loadAmsterdam"
      >Laad Amsterdam Plus- en Hoofdnetten</v-btn
    >
    <v-file-input
      v-model="file"
      label="GeoJSON-bestand"
      accept=".geojson,.json,application/geo+json,application/json"
      :disabled="loading"
    />
    <p v-if="sourceName" class="mb-4">Bron: {{ sourceName }}</p>
    <v-alert v-if="warnings.length" type="warning" class="mb-4">
      <p v-for="warning in warnings" :key="warning">{{ warning }}</p>
      <v-checkbox
        v-model="acceptMissing"
        label="Ik wil alleen de beschikbare lagen importeren"
        :disabled="loading"
        hide-details
      />
    </v-alert>
    <v-form @submit.prevent="inspect">
      <v-text-field
        v-model="title"
        label="Titel (standaard voor ieder object)"
        :disabled="loading"
      />
      <v-textarea
        v-model="description"
        label="Beschrijving"
        :disabled="loading"
      />
      <v-select
        v-model="titleProperty"
        :items="attributes"
        label="Attribuut voor titel (optioneel)"
        clearable
        :disabled="loading"
        hint="Zonder waarde wordt de standaardtitel gebruikt."
        persistent-hint
      />
      <v-select
        v-model="categoryProperty"
        :items="[
          { title: 'Eén categorie voor alle objecten', value: '' },
          ...attributes.map((value) => ({ title: value, value })),
        ]"
        label="Categorie-indeling"
        :disabled="loading"
      />
      <CategorySelect
        v-if="!categoryProperty"
        v-model="categoryId"
        :legends="categories || []"
        label="Categorie"
        class="mb-4"
        :disabled="loading"
      />
      <v-btn
        type="submit"
        :loading="loading"
        :disabled="!geojson || !title.trim() || !description.trim() || loading"
        >Bekijk importvoorbeeld</v-btn
      >
    </v-form>
    <v-alert v-if="error" type="error" class="my-4">{{ error }}</v-alert>
    <v-card v-if="preview" class="my-4">
      <v-card-title>Importvoorbeeld</v-card-title>
      <v-card-text>
        <p>
          {{ preview.sourceFeatures }} objecten na laagselectie →
          {{ preview.issues }} bewerkbare meldingen.
        </p>
        <p class="mb-4">
          Geometrieën:
          {{
            Object.entries(preview.geometries)
              .map(([name, count]) => `${name}: ${count}`)
              .join(", ")
          }}
        </p>
        <p v-if="amsterdam" class="mb-4">
          Een straat kan bij meerdere vervoersnetten horen en krijgt dan per
          laag een melding. Bronbestanden:
          {{
            amsterdam.sources
              .map((source) => `${source.table}: ${source.features}`)
              .join(", ")
          }}.
        </p>
        <v-table>
          <thead>
            <tr>
              <th>Groep</th>
              <th>Objecten</th>
              <th>Meldingen</th>
              <th>Categorie</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in preview.groups" :key="group.key">
              <td>{{ group.label }}</td>
              <td>{{ group.sourceFeatures }}</td>
              <td>{{ group.issues }}</td>
              <td v-if="categoryProperty" style="min-width: 300px">
                <v-select
                  v-model="targets[group.key]!.legend_id"
                  :items="categoryChoices"
                  :label="`Categorie voor ${group.label}`"
                  :disabled="loading"
                  hide-details
                />
                <template v-if="targets[group.key]!.legend_id === null">
                  <v-text-field
                    v-model="targets[group.key]!.name"
                    :label="`Nieuwe categorie voor ${group.label}`"
                    :disabled="loading"
                    hide-details
                  />
                  <v-text-field
                    v-model="targets[group.key]!.color"
                    :label="`Kleur voor ${group.label}`"
                    type="color"
                    :disabled="loading"
                    hide-details
                  />
                </template>
              </td>
              <td v-else>
                {{
                  categories?.find((category) => category.id === categoryId)
                    ?.name || "Kies een categorie"
                }}
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-btn
          class="mt-4"
          color="primary"
          :loading="loading"
          :disabled="!canImport"
          @click="submit"
          >Importeer {{ preview.issues }} meldingen</v-btn
        >
      </v-card-text>
    </v-card>
    <v-alert v-if="imported !== null" type="success" class="my-4"
      >{{ imported }} meldingen geïmporteerd.
      <NuxtLink to="/kaart">Naar de kaart</NuxtLink></v-alert
    >
  </div>
</template>

<script setup lang="ts">
import type {
  AmsterdamImport,
  ImportPreview,
} from "~~/shared/types/GeojsonImport";
definePageMeta({
  middleware: ["sidebase-auth", () => useRoles().isAdmin.value || "/admin"],
});
useTitle("GeoJSON importeren");
const categoriesStore = useCategories();
const { categories } = storeToRefs(categoriesStore);
const { token } = useAuth();
const file = ref<File | null>(null);
const geojson = shallowRef<unknown>(null);
const amsterdam = shallowRef<AmsterdamImport | null>(null);
const sourceName = ref("");
const attributes = ref<string[]>([]);
const categoryId = ref<number | null>(null);
const categoryProperty = ref("");
const titleProperty = ref<string | null>(null);
const title = ref("");
const description = ref("");
const preview = shallowRef<ImportPreview | null>(null);
const targets = ref<
  Record<string, { legend_id: number | null; name: string; color: string }>
>({});
const loading = ref(false);
const error = ref("");
const imported = ref<number | null>(null);
const warnings = computed(() => amsterdam.value?.warnings ?? []);
const acceptMissing = ref(false);
const categoryChoices = computed(() => [
  { title: "Nieuwe categorie", value: null },
  ...(categories.value ?? []).map((category) => ({
    title: category.name,
    value: category.id,
  })),
]);
const canImport = computed(
  () =>
    !loading.value &&
    preview.value &&
    (!warnings.value.length || acceptMissing.value) &&
    (categoryProperty.value
      ? preview.value.groups.every((group) => {
          const target = targets.value[group.key];
          return (
            target &&
            (target.legend_id !== null ||
              (target.name.trim() && /^#[0-9a-f]{6}$/i.test(target.color)))
          );
        })
      : !!categoryId.value),
);
const headers = computed(() => ({ Authorization: token.value || "" }));
const requestBody = () => ({
  geojson: geojson.value,
  title: title.value,
  description: description.value,
  titleProperty: titleProperty.value || undefined,
  categoryProperty: categoryProperty.value || undefined,
});

function showFailure(cause: unknown) {
  const failure = cause as { data?: { message?: string }; message?: string };
  error.value =
    failure.data?.message || failure.message || "Importeren mislukt";
}
function setData(data: unknown) {
  geojson.value = data;
  const features = (
    data as { features?: { properties?: Record<string, unknown> }[] }
  )?.features;
  attributes.value = Array.isArray(features)
    ? [
        ...new Set(
          features.flatMap((feature) => Object.keys(feature?.properties ?? {})),
        ),
      ].sort()
    : [];
  preview.value = null;
  imported.value = null;
}
watch([title, description, titleProperty, categoryProperty, geojson], () => {
  preview.value = null;
});
watch(file, async (current) => {
  if (!current) return;
  loading.value = true;
  error.value = "";
  geojson.value = null;
  preview.value = null;
  amsterdam.value = null;
  try {
    if (current.size > 25 * 1024 * 1024)
      throw new Error("Het bestand mag maximaal 25 MB zijn");
    const data = JSON.parse(await current.text());
    setData(data);
    sourceName.value = current.name;
    categoryProperty.value = "";
    titleProperty.value = null;
  } catch (cause) {
    showFailure(cause);
  } finally {
    loading.value = false;
  }
});
async function loadAmsterdam() {
  loading.value = true;
  error.value = "";
  preview.value = null;
  geojson.value = null;
  amsterdam.value = null;
  acceptMissing.value = false;
  try {
    const data = await $fetch<AmsterdamImport>("/api/admin/import/amsterdam", {
      headers: headers.value,
    });
    amsterdam.value = data;
    file.value = null;
    setData(data.geojson);
    categoryProperty.value = data.categoryProperty;
    titleProperty.value = data.titleProperty;
    title.value = "Plus- en Hoofdnetten";
    description.value = `Gemeente Amsterdam — Plus- en Hoofdnetten. Bron: ${data.sourceUrl}`;
    sourceName.value = "Amsterdam Plus- en Hoofdnetten";
  } catch (cause) {
    showFailure(cause);
  } finally {
    loading.value = false;
  }
}
async function inspect() {
  if (!geojson.value || loading.value) return;
  loading.value = true;
  error.value = "";
  imported.value = null;
  preview.value = null;
  try {
    const result = await $fetch<ImportPreview>("/api/admin/import/preview", {
      method: "POST",
      headers: headers.value,
      body: requestBody(),
    });
    targets.value = Object.fromEntries(
      result.groups.map((group) => {
        const existing = categories.value?.find(
          (category) => category.name === group.label,
        );
        return [
          group.key,
          {
            legend_id: existing?.id ?? null,
            name: group.label,
            color:
              amsterdam.value?.layers.find(
                (layer) => layer.name === group.label,
              )?.color ?? "#2196F3",
          },
        ];
      }),
    );
    preview.value = result;
  } catch (cause) {
    showFailure(cause);
  } finally {
    loading.value = false;
  }
}
async function submit() {
  if (!canImport.value) return;
  loading.value = true;
  error.value = "";
  try {
    const mappings = preview.value!.groups.map((group) => {
      const target = targets.value[group.key]!;
      return target.legend_id === null
        ? { key: group.key, name: target.name, color: target.color }
        : { key: group.key, legend_id: target.legend_id };
    });
    const result = await $fetch<{ imported: number }>("/api/admin/import", {
      method: "POST",
      headers: headers.value,
      body: { ...requestBody(), legend_id: categoryId.value, mappings },
    });
    imported.value = result.imported;
    preview.value = null;
    file.value = null;
    geojson.value = null;
    await categoriesStore.refresh();
  } catch (cause) {
    showFailure(cause);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width: 1000px">
    <h1 class="text-h4 mb-4">GeoJSON importeren</h1>
    <nav aria-label="Importstappen" class="import-steps mb-6">
      <ol>
        <li v-for="(label, index) in stepLabels" :key="label">
          <button
            type="button"
            :aria-current="step === index + 1 ? 'step' : undefined"
            :disabled="loading || imported !== null || index + 1 > step"
            @click="step = index + 1"
          >
            <span class="import-step-number">{{ index + 1 }}</span>
            {{ label }}
          </button>
        </li>
      </ol>
    </nav>
    <v-alert v-if="error" type="error" class="my-4" role="alert">{{
      error
    }}</v-alert>
    <section
      v-show="step === 1 && imported === null"
      aria-labelledby="source-heading"
    >
      <h2 id="source-heading" class="text-h6 mb-3">Kies een bron</h2>
      <p class="mb-4">
        Importeer kaartgegevens voor je afdeling, bijvoorbeeld fietspaden,
        oversteekplaatsen of knelpunten. Kies een GeoJSON-bestand (.geojson of
        .json, maximaal 25 MB) van bijvoorbeeld een gemeente, provincie of je
        eigen afdeling.
      </p>
      <p class="mb-4">
        Gebruik lengte- en breedtegraden (WGS84 / EPSG:4326). Heb je een ander
        kaartformaat of coördinatenstelsel? Exporteer het eerst als GeoJSON in
        WGS84.
      </p>
      <v-file-input
        v-model="file"
        label="GeoJSON-bestand"
        accept=".geojson,.json,application/geo+json,application/json"
        :disabled="loading"
      />
      <p v-if="sourceName" class="mb-4">Bron: {{ sourceName }}</p>
      <v-btn color="primary" :disabled="!geojson || loading" @click="step = 2">
        Verder naar instellingen
      </v-btn>
    </section>
    <section
      v-show="step === 2 && imported === null"
      aria-labelledby="settings-heading"
    >
      <h2 id="settings-heading" class="text-h6 mb-3">Stel de import in</h2>
      <p class="mb-4">
        Bron: {{ sourceName }}. Elk object wordt een bewerkbare melding.
        Meervoudige geometrieën worden opgesplitst.
      </p>
      <v-form @submit.prevent="inspect">
        <v-text-field
          v-model="title"
          label="Titel (standaard voor ieder object)"
          :disabled="loading"
        />
        <v-textarea
          v-model="description"
          label="Beschrijving"
          hint="Vermeld bijvoorbeeld de bron, datum en wat deze gegevens voor je afdeling betekenen."
          persistent-hint
          :disabled="loading"
        />
        <v-select
          v-model="titleProperty"
          :items="attributes"
          label="Gegevensveld voor titel (optioneel)"
          clearable
          :disabled="loading"
          hint="Kies bijvoorbeeld het veld met de straatnaam. Zonder keuze gebruiken alle meldingen de standaardtitel."
          persistent-hint
        />
        <v-checkbox
          v-model="mergeLines"
          label="Aansluitende lijnsegmenten samenvoegen"
          :disabled="loading"
          hide-details
        />
        <p class="text-body-2 mb-4">
          Alleen dezelfde weg- of routenaam, categorie en overige gegevens
          worden samengevoegd. Alleen exacte eindpunten tellen; vertakkingen en
          gaten blijven apart. Punten en vlakken veranderen niet.
        </p>
        <v-select
          v-if="mergeLines"
          v-model="mergeProperty"
          :items="attributes"
          label="Gegevensveld voor samenvoegen"
          :disabled="loading"
          hint="Kies het veld met de weg- of routenaam. Segmenten zonder waarde worden niet samengevoegd."
          persistent-hint
        />
        <v-select
          v-model="categoryProperty"
          :items="[
            { title: 'Eén categorie voor alle objecten', value: '' },
            ...attributes.map((value) => ({ title: value, value })),
          ]"
          label="Categorie-indeling"
          hint="Kies een gegevensveld om lagen te maken, bijvoorbeeld type of route. Elke unieke waarde wordt een laag die je in de volgende stap kunt aan- of uitvinken en aan een categorie koppelt."
          persistent-hint
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
          :disabled="
            !geojson ||
            !title.trim() ||
            !description.trim() ||
            (mergeLines && !mergeProperty) ||
            loading
          "
          >Bekijk importvoorbeeld</v-btn
        >
        <v-btn class="ml-2" :disabled="loading" @click="step = 1">Vorige</v-btn>
      </v-form>
    </section>
    <v-card
      v-if="preview && step === 3 && imported === null"
      class="my-4"
      variant="flat"
    >
      <v-card-title
        ><h2 class="text-h6">Selecteer lagen en importeer</h2></v-card-title
      >
      <v-card-text>
        <p>
          {{ preview.sourceFeatures }} beschikbare objecten →
          {{ preview.issues }} bewerkbare meldingen.
        </p>
        <p v-if="preview.lineSegments" class="mb-4">
          Lijnsegmenten: {{ preview.lineSegments }} →
          {{ preview.lines }} lijnen{{
            mergeLines ? " na samenvoegen" : " (samenvoegen uit)"
          }}.
        </p>
        <p class="mb-4">
          Geometrieën:
          {{
            Object.entries(preview.geometries)
              .map(([name, count]) => `${name}: ${count}`)
              .join(", ")
          }}
        </p>
        <p class="mb-2">
          Vink de lagen aan die je wilt importeren.
          {{ selectedGroups.length }} van {{ preview.groups.length }} lagen
          geselecteerd.
        </p>
        <v-btn
          :disabled="loading"
          @click="selectedGroupKeys = preview.groups.map((group) => group.key)"
          >Alles selecteren</v-btn
        >
        <v-btn :disabled="loading" @click="selectedGroupKeys = []"
          >Selectie wissen</v-btn
        >
        <v-table height="min(55vh, 560px)" fixed-header>
          <thead>
            <tr>
              <th>Importeren</th>
              <th>Groep</th>
              <th>Objecten</th>
              <th>Meldingen</th>
              <th>Categorie</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in preview.groups" :key="group.key">
              <td>
                <v-checkbox
                  v-model="selectedGroupKeys"
                  :value="group.key"
                  :label="`Importeer ${group.label}`"
                  :disabled="loading"
                  hide-details
                />
              </td>
              <td>{{ group.label }}</td>
              <td>{{ group.sourceFeatures }}</td>
              <td>{{ group.issues }}</td>
              <td v-if="categoryProperty" style="min-width: 300px">
                <v-select
                  v-model="targets[group.key]!.legend_id"
                  :items="categoryChoices"
                  :label="`Categorie voor ${group.label}`"
                  :disabled="loading || !selectedGroupKeys.includes(group.key)"
                  hide-details
                />
                <template v-if="targets[group.key]!.legend_id === null">
                  <v-text-field
                    v-model="targets[group.key]!.name"
                    :label="`Nieuwe categorie voor ${group.label}`"
                    :disabled="
                      loading || !selectedGroupKeys.includes(group.key)
                    "
                    hide-details
                  />
                  <v-text-field
                    v-model="targets[group.key]!.color"
                    :label="`Kleur voor ${group.label}`"
                    type="color"
                    :disabled="
                      loading || !selectedGroupKeys.includes(group.key)
                    "
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
        <p class="mt-4">Opnieuw importeren maakt nieuwe meldingen.</p>
        <v-btn class="mt-4 mr-2" :disabled="loading" @click="step = 2"
          >Vorige</v-btn
        >
        <v-btn
          class="mt-4"
          color="primary"
          :loading="loading"
          :disabled="!canImport"
          @click="submit"
          >Importeer {{ selectedIssueCount }} meldingen</v-btn
        >
      </v-card-text>
    </v-card>
    <v-alert v-if="imported !== null" type="success" class="my-4"
      >{{ imported }} meldingen geïmporteerd.
      <NuxtLink to="/kaart">Naar de kaart</NuxtLink>
      <v-btn class="ml-3" @click="startNewImport">Nieuwe import</v-btn></v-alert
    >
  </div>
</template>

<script setup lang="ts">
import type { ImportPreview } from "~~/shared/types/GeojsonImport";
definePageMeta({
  middleware: ["sidebase-auth", () => useRoles().isAdmin.value || "/admin"],
});
useTitle("GeoJSON importeren");
const categoriesStore = useCategories();
const { categories } = storeToRefs(categoriesStore);
const { token } = useAuth();
const step = ref(1);
const stepLabels = ["Bron", "Instellingen", "Lagen en import"];
const file = ref<File | null>(null);
const geojson = shallowRef<unknown>(null);
const sourceName = ref("");
const attributes = ref<string[]>([]);
const categoryId = ref<number | null>(null);
const categoryProperty = ref("");
const titleProperty = ref<string | null>(null);
const mergeLines = ref(false);
const mergeProperty = ref<string | null>(null);
const title = ref("");
const description = ref("");
const preview = shallowRef<ImportPreview | null>(null);
const selectedGroupKeys = ref<string[]>([]);
const selectedGroups = computed(
  () =>
    preview.value?.groups.filter((group) =>
      selectedGroupKeys.value.includes(group.key),
    ) ?? [],
);
const selectedIssueCount = computed(() =>
  selectedGroups.value.reduce((count, group) => count + group.issues, 0),
);
const targets = ref<
  Record<string, { legend_id: number | null; name: string; color: string }>
>({});
const loading = ref(false);
const error = ref("");
const imported = ref<number | null>(null);
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
    selectedGroups.value.length > 0 &&
    (categoryProperty.value
      ? selectedGroups.value.every((group) => {
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
  mergeLines: mergeLines.value,
  mergeProperty: mergeLines.value
    ? mergeProperty.value || undefined
    : undefined,
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
watch(
  [
    title,
    description,
    titleProperty,
    categoryProperty,
    geojson,
    mergeLines,
    mergeProperty,
  ],
  () => {
    preview.value = null;
  },
);
watch(file, async (current) => {
  if (!current) {
    geojson.value = null;
    preview.value = null;
    sourceName.value = "";
    return;
  }
  loading.value = true;
  error.value = "";
  geojson.value = null;
  preview.value = null;
  try {
    if (current.size > 25 * 1024 * 1024)
      throw new Error("Het bestand mag maximaal 25 MB zijn");
    const data = JSON.parse(await current.text());
    setData(data);
    sourceName.value = current.name;
    categoryProperty.value = "";
    mergeLines.value = false;
    mergeProperty.value = null;
    titleProperty.value = null;
  } catch (cause) {
    showFailure(cause);
  } finally {
    loading.value = false;
  }
});
async function inspect() {
  if (!geojson.value || loading.value) return;
  if (preview.value) {
    step.value = 3;
    return;
  }
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
            color: "#2196F3",
          },
        ];
      }),
    );
    selectedGroupKeys.value = result.groups.map((group) => group.key);
    preview.value = result;
    step.value = 3;
  } catch (cause) {
    showFailure(cause);
  } finally {
    loading.value = false;
  }
}
function startNewImport() {
  imported.value = null;
  error.value = "";
  sourceName.value = "";
  title.value = "";
  description.value = "";
  titleProperty.value = null;
  categoryProperty.value = "";
  categoryId.value = null;
  mergeLines.value = false;
  mergeProperty.value = null;
  attributes.value = [];
  targets.value = {};
  selectedGroupKeys.value = [];
  step.value = 1;
}
async function submit() {
  if (!canImport.value) return;
  loading.value = true;
  error.value = "";
  try {
    const mappings = selectedGroups.value.map((group) => {
      const target = targets.value[group.key]!;
      return target.legend_id === null
        ? { key: group.key, name: target.name, color: target.color }
        : { key: group.key, legend_id: target.legend_id };
    });
    const result = await $fetch<{ imported: number }>("/api/admin/import", {
      method: "POST",
      headers: headers.value,
      body: {
        ...requestBody(),
        legend_id: categoryId.value,
        mappings,
        selectedGroupKeys: selectedGroupKeys.value,
      },
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

<style scoped>
.import-steps ol {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  list-style: none;
  padding: 0;
}
.import-steps button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 3px solid transparent;
}
.import-steps button[aria-current="step"] {
  border-color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.import-steps button:disabled {
  opacity: 0.6;
}
.import-steps button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
.import-step-number {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid currentColor;
  border-radius: 50%;
}
</style>

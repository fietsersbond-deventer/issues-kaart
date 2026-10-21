<template>
  <div style="max-width: 720px">
    <h1 class="text-h4 mb-4">GeoJSON importeren</h1>
    <p class="mb-4">
      Upload een GeoJSON-bestand in WGS84 (lengtegraad, breedtegraad),
      bijvoorbeeld van
      <a
        href="https://maps.amsterdam.nl/open_geodata/"
        target="_blank"
        rel="noopener noreferrer"
        >Maps Amsterdam</a
      >. Elk object wordt een normaal bewerkbare melding. Meervoudige
      geometrieën worden opgesplitst. Attributen worden toegevoegd aan de
      beschrijving. Opnieuw importeren maakt nieuwe meldingen.
    </p>
    <v-form @submit.prevent="submit">
      <v-file-input
        v-model="file"
        label="GeoJSON-bestand"
        accept=".geojson,.json,application/geo+json,application/json"
        :disabled="loading"
      />
      <CategorySelect
        v-model="categoryId"
        :legends="categories || []"
        label="Categorie"
        class="mb-4"
        :disabled="loading"
      />
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
      <v-text-field
        v-model="titleProperty"
        label="Attribuut voor titel (optioneel)"
        hint="Bijvoorbeeld NAAM. Zonder waarde wordt de standaardtitel gebruikt."
        persistent-hint
        :disabled="loading"
      />
      <v-alert v-if="error" type="error" class="my-4">{{ error }}</v-alert>
      <v-alert v-if="imported !== null" type="success" class="my-4">
        {{ imported }} meldingen geïmporteerd. Je kunt deze op de kaart openen
        en bewerken.
        <NuxtLink to="/">Naar de kaart</NuxtLink>
      </v-alert>
      <v-btn
        class="mt-4"
        type="submit"
        color="primary"
        :loading="loading"
        :disabled="!file || !categoryId || !title.trim() || !description.trim()"
        >Importeren</v-btn
      >
    </v-form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["sidebase-auth", () => useRoles().isAdmin.value || "/admin"],
});
useTitle("GeoJSON importeren");
const { categories } = storeToRefs(useCategories());
const { token } = useAuth();
const file = ref<File | null>(null);
const categoryId = ref<number | null>(null);
const title = ref("");
const description = ref("");
const titleProperty = ref("");
const loading = ref(false);
const error = ref("");
const imported = ref<number | null>(null);

async function submit() {
  if (!file.value || loading.value) return;
  loading.value = true;
  error.value = "";
  imported.value = null;
  try {
    if (file.value.size > 10 * 1024 * 1024)
      throw new Error("Het bestand mag maximaal 10 MB zijn");
    let geojson: unknown;
    try {
      geojson = JSON.parse(await file.value.text());
    } catch {
      throw new Error("Het bestand bevat geen geldige JSON");
    }
    const result = await $fetch<{ imported: number }>("/api/admin/import", {
      method: "POST",
      headers: { Authorization: token.value || "" },
      body: {
        geojson,
        legend_id: categoryId.value,
        title: title.value,
        description: description.value,
        titleProperty: titleProperty.value || undefined,
      },
    });
    imported.value = result.imported;
    file.value = null;
  } catch (cause) {
    const failure = cause as { data?: { message?: string }; message?: string };
    error.value =
      failure.data?.message || failure.message || "Importeren mislukt";
  } finally {
    loading.value = false;
  }
}
</script>

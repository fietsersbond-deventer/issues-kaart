<template>
  <div>
    <v-form
      v-if="issue"
      v-model="valid"
      lazy-validation
      @submit.prevent="onSubmit"
    >
      <v-text-field
        v-model.trim="issue.title"
        label="Titel"
        :rules="[(v:string) => !!v || 'Titel is verplicht']"
        required
      />

      <v-textarea
        v-model.trim="issue.description"
        label="Beschrijving"
        :rules="[(v:string) => !!v || 'Beschrijving is verplicht']"
        required
      />

      <v-color-picker
        v-model="issue.color"
        mode="hex"
        label="Kleur"
        hide-inputs
      />

      <v-btn type="submit" color="primary">Opslaan</v-btn>

      <pre>{{ issue }}</pre>
    </v-form>
  </div>
</template>

<script lang="ts" setup>
import type { Issue } from "~/types/Issue";

const valid = ref(true);
const route = useRoute();
const { id } = route.params;
const issue = ref<Issue | null>(null);

const { get, update, create } = useIssueApi();

const reactiveFeature = useEditableFeature().inject();

if (!id) {
  // Redirect to new item creation
  navigateTo("/kaart");
} else if (typeof id !== "string") {
  // Handle invalid id type
  navigateTo("/kaart");
} else if (id === "new") {
  issue.value = {
    id: "",
    title: "",
    description: "",
    color: "#2196F3",
    geometry: reactiveFeature.feature.value?.geometry,
  };
} else {
  // Fetch existing item
  const data = await get(id as string);
  if (!data) {
    issue.value = null;
    // Handle issue not found
    navigateTo("/kaart");
  } else {
    issue.value = data;
  }
}

async function onSubmit() {
  if (issue.value && valid.value) {
    if (issue.value.id) {
      // Update existing issue
      await update(issue.value.id, issue.value);
    } else {
      // Create new issue
      const result = await create(issue.value);
      if (result.data.value?.id) {
        return navigateTo(`/kaart/${result.data.value.id}`);
      }
    }
  }
}

watch(
  reactiveFeature.feature,
  (newValue) => {
    if (issue.value) {
      issue.value.geometry = newValue?.geometry;
    }
  },
  { immediate: true, deep: true }
);
</script>

<style></style>

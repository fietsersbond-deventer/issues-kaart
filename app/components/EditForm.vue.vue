<template>
  <div>
    <v-form
      v-if="issue"
      v-form="valid"
      lazy-validation
      @submit.prevent="onSubmit"
    >
      <v-text-field
        v-model.trim="issue.title"
        label="Titel"
        :rules="[(v:string) => !!v || 'Titel is verplicht']"
        required
      />

      <v-text-area
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
    </v-form>
  </div>
</template>

<script lang="ts" setup>
import type { Issue } from "~/types/Issue";

const valid = ref(true);
const route = useRoute();
const { id } = route.params;
let issue: Issue | null = null;

const { get, update, create } = useIssueApi();

const reactiveFeature = useEditableFeature().inject();

if (!id) {
  // Redirect to new item creation
  navigateTo("/kaart");
} else if (typeof id !== "string") {
  // Handle invalid id type
  navigateTo("/kaart");
} else if (id === "new") {
  issue = {
    id: "",
    title: "",
    description: "",
    color: "#2196F3",
    geometry: reactiveFeature.feature.value?.geometry,
  };
} else {
  // Fetch existing item
  const issue = await get(id as string);
  if (!issue) {
    // Handle issue not found
    navigateTo("/kaart");
  }
}

async function onSubmit() {
  if (issue && valid.value) {
    if (issue.id) {
      // Update existing issue
      await update(issue.id, {
        ...issue,
        geometry: reactiveFeature.feature.value?.geometry,
      });
    } else {
      // Create new issue
      const result = await create({
        ...issue,
        geometry: reactiveFeature.feature.value?.geometry,
      });
      if (result.data.value?.id) {
        return navigateTo(`/kaart/${result.data.value.id}`);
      }
    }
  }
}
</script>

<style></style>

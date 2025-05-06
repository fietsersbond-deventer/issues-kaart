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
        hide-sliders
        hide-canvas
        show-swatches
        :swatches
      />

      <div class="d-flex gap-4">
        <v-btn type="submit" color="primary">Opslaan</v-btn>
        <v-btn v-if="issue.id" color="error" @click="onDelete"
          >Verwijderen</v-btn
        >
      </div>

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

const { get, update, create, remove } = useIssueApi();

const swatches = [
  ["#FF0000", "#FF5555", "#FFAAAA"], // Very Bad (Red)
  ["#FFAA00", "#FFBB55", "#FFCCAA"], // Bad (Orange)
  ["#FFFF00", "#FFFF55", "#FFFFAA"], // Neutral (Yellow)
  ["#AAFF00", "#BBFF55", "#CCFFAA"], // Good (Light Green)
  ["#00FF00", "#55FF55", "#AAFFAA"], // Very Good (Green)
];

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
    geometry: reactiveFeature.feature.value?.geometry || {
      type: "Point",
      coordinates: [0, 0],
    },
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
      if (result.id) {
        return navigateTo(`/kaart/${result.id}`);
      }
    }
  }
}

async function onDelete() {
  if (issue.value?.id) {
    if (
      confirm(`Weet je zeker dat je '${issue.value.title}' wilt verwijderen?`)
    ) {
      await remove(issue.value.id);
      navigateTo("/kaart");
    }
  }
}

watch(
  reactiveFeature.feature,
  (newValue) => {
    if (issue.value && newValue) {
      issue.value.geometry = newValue?.geometry;
    }
  },
  { immediate: true, deep: true }
);
</script>

<style></style>

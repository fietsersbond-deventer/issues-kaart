<template>
  <div>
    <v-form
      v-if="issue"
      v-model="valid"
      lazy-validation
      @submit.prevent="onSubmit"
    >
      <v-card>
        <v-card-text>
          <v-text-field
            v-model.trim="issue.title"
            label="Titel"
            :rules="[(v:string) => !!v || 'Titel is verplicht']"
            required
          />

          <div class="mb-4">
            <label class="text-subtitle-1 mb-1">Beschrijving</label>
            <Editor
              v-model="issue.description"
              :api-key="config.public.tinymceApiKey"
              :init="{
                height: 300,
                menubar: false,
                plugins: ['link', 'lists'],
                toolbar: [
                  { name: 'history', items: ['undo', 'redo'] },
                  { name: 'styles', items: ['styles'] },
                  { name: 'formatting', items: ['bold', 'italic'] },
                  {
                    name: 'alignment',
                    items: [
                      'alignleft',
                      'aligncenter',
                      'alignright',
                      'alignjustify',
                    ],
                  },
                  { name: 'indentation', items: ['outdent', 'indent'] },
                ],
                formats: {
                  h1: { block: 'h1' },
                  h2: { block: 'h2' },
                  h3: { block: 'h3' },
                  p: { block: 'p' },
                },
                statusbar: false,
              }"
            />
            <div v-if="!issue.description" class="text-error text-caption mt-1">
              Beschrijving is verplicht
            </div>
          </div>

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
        </v-card-text>
        <v-card-actions>
          <v-btn type="submit" color="primary">Opslaan</v-btn>
          <v-btn color="secondary" @click="showDialog = false">Annuleren</v-btn>
          <v-btn v-if="issue.id" color="error" @click="onDelete"
            >Verwijderen</v-btn
          >
        </v-card-actions>

        <!-- <pre v-if="!isProduction">{{ issue }}</pre> -->
      </v-card>
    </v-form>
  </div>
</template>

<script lang="ts" setup>
import Editor from "@tinymce/tinymce-vue";
import type { Issue } from "~/types/Issue";

const valid = ref(true);

const isProduction = useRuntimeConfig().isProduction;
const showDialog = defineModel<boolean>("dialog", { required: false });
const issue = defineModel<Issue>({ required: true });

const { update, create, remove } = useIssueApi();

const swatches = [
  ["#FF0000", "#FF5555", "#FFAAAA"], // Very Bad (Red)
  ["#FFAA00", "#FFBB55", "#FFCCAA"], // Bad (Orange)
  ["#FFFF00", "#FFFF55", "#FFFFAA"], // Neutral (Yellow)
  ["#AAFF00", "#BBFF55", "#CCFFAA"], // Good (Light Green)
  ["#00FF00", "#55FF55", "#AAFFAA"], // Very Good (Green)
];

const reactiveFeature = useEditableFeature().inject();
const config = useRuntimeConfig();

async function onSubmit() {
  if (issue.value && valid.value) {
    if (issue.value.id) {
      // Update existing issue
      await update(issue.value.id, issue.value);
    } else {
      // Create new issue
      const result = await create(issue.value);
      if (result.id) {
        showDialog.value = false;
        return navigateTo(`/kaart/${result.id}`);
      }
    }
  }
  showDialog.value = false;
}

async function onDelete() {
  if (issue.value?.id) {
    if (
      confirm(`Weet je zeker dat je '${issue.value.title}' wilt verwijderen?`)
    ) {
      await remove(issue.value.id);
      showDialog.value = false;
      return navigateTo("/kaart");
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

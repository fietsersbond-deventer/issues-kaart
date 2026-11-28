<template>
  <div>
    <v-text-field
      v-model="settings.title"
      label="Standaardtitel"
      hint="Voor objecten zonder waarde in het titelveld"
      persistent-hint
      class="mb-2"
    />
    <v-textarea
      v-model="settings.description"
      label="Standaardbeschrijving (optioneel)"
      hint="Voor objecten zonder eigen beschrijving"
      persistent-hint
      rows="2"
      auto-grow
      class="mb-2"
    />
    <v-select
      v-model="settings.titleField"
      :items="fieldNames"
      label="Gegevensveld voor titel (optioneel)"
      clearable
    />
    <v-select
      v-model="settings.categoryField"
      :items="fieldNames"
      label="Gegevensveld voor categorie (optioneel)"
      hint="Elke waarde van dit veld koppel je in de volgende stap aan een categorie. Zonder veld komen alle objecten in één categorie."
      persistent-hint
      clearable
      class="mb-2"
    />
    <v-select
      v-model="settings.htmlField"
      :items="fieldNames"
      label="Gegevensveld met HTML-opmaak (optioneel)"
      hint="Wordt met opmaak en afbeeldingen overgenomen, zoals de beschrijving uit Google My Maps"
      persistent-hint
      clearable
      class="mb-4"
    />

    <h3 class="text-subtitle-1 mb-1">Velden in de beschrijving</h3>
    <p v-if="!descriptionFields.length" class="text-medium-emphasis">
      Geen andere gegevensvelden.
    </p>
    <v-checkbox
      v-for="field in descriptionFields"
      :key="field.name"
      v-model="settings.fields"
      :value="field.name"
      density="compact"
      hide-details
    >
      <template #label>
        <span>
          <strong>{{ field.name }}</strong>
          <span v-if="field.sample" class="text-medium-emphasis">
            — {{ truncate(field.sample) }}
          </span>
        </span>
      </template>
    </v-checkbox>

    <div class="mt-4">
      <v-btn @click="emit('previous')">Vorige</v-btn>
      <v-btn
        color="primary"
        class="ml-2"
        :disabled="!settings.title.trim()"
        @click="emit('next')"
      >
        Volgende
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ImportField,
  ImportSettings,
} from "~~/shared/types/GeojsonImport";

const { fields = [] } = defineProps<{ fields?: ImportField[] }>();
const settings = defineModel<ImportSettings>("settings", { required: true });

const emit = defineEmits<{ previous: []; next: [] }>();

const fieldNames = computed(() => fields.map(({ name }) => name));

/**
 * Fields used as title, category or HTML are hidden here and left out of the
 * description (see buildImportDescription), but keep their checkbox state.
 */
const usedFields = computed(
  () =>
    new Set(
      [
        settings.value.titleField,
        settings.value.categoryField,
        settings.value.htmlField,
      ].filter(Boolean),
    ),
);
const descriptionFields = computed(() =>
  fields.filter(({ name }) => !usedFields.value.has(name)),
);

function truncate(value: string) {
  return value.length > 60 ? `${value.slice(0, 60)}…` : value;
}
</script>

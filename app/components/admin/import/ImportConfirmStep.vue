<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>
    <template v-else>
      <p class="mb-4">
        Er worden <strong>{{ issueCount }}</strong> onderwerpen
        aangemaakt<template v-if="newCategoryCount">
          en <strong>{{ newCategoryCount }}</strong> nieuwe
          categorieën</template
        >. Objecten met meerdere geometrieën worden gesplitst in meerdere
        onderwerpen.
      </p>

      <template v-if="images.length">
        <h3 class="text-subtitle-1 mb-1">Afbeeldingen</h3>
        <p class="mb-2">
          Afbeeldingen worden verkleind en in de beschrijving opgeslagen, zodat
          ze blijven werken als de oorspronkelijke kaart verdwijnt.
        </p>
        <v-progress-linear
          :model-value="(finishedCount / images.length) * 100"
          :indeterminate="isDownloading && !finishedCount"
          color="primary"
          height="8"
          rounded
          class="mb-2"
        />
        <p class="mb-2">
          {{ doneCount }} van {{ images.length }} verwerkt<template
            v-if="failed.length"
            >, {{ failed.length }} mislukt</template
          >.
        </p>
        <template v-if="failed.length && !isDownloading">
          <v-list density="compact" class="mb-2">
            <v-list-item
              v-for="image in failed"
              :key="image.source"
              :title="image.source"
              :subtitle="image.error"
            />
          </v-list>
          <v-btn class="mb-2" prepend-icon="mdi-refresh" @click="emit('retry')">
            Opnieuw proberen
          </v-btn>
          <v-checkbox
            v-model="skipFailed"
            label="Importeren zonder de mislukte afbeeldingen"
            hide-details
          />
        </template>
      </template>
    </template>

    <div class="mt-4">
      <v-btn :disabled="importing" @click="emit('previous')">Vorige</v-btn>
      <v-btn
        color="primary"
        class="ml-2"
        :loading="importing"
        :disabled="!canImport"
        @click="emit('import')"
      >
        Importeren
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImportImage } from "~/composables/useImportImages";

const {
  issueCount = 0,
  newCategoryCount = 0,
  images = [],
  isDownloading = false,
  importing = false,
  error = "",
} = defineProps<{
  issueCount?: number;
  newCategoryCount?: number;
  images?: ImportImage[];
  isDownloading?: boolean;
  importing?: boolean;
  error?: string;
}>();
const skipFailed = defineModel<boolean>("skipFailed", { default: false });

const emit = defineEmits<{ previous: []; retry: []; import: [] }>();

const failed = computed(() =>
  images.filter(({ status }) => status === "failed"),
);
const doneCount = computed(
  () => images.filter(({ status }) => status === "done").length,
);
const finishedCount = computed(() => doneCount.value + failed.value.length);

const canImport = computed(
  () =>
    !error &&
    issueCount > 0 &&
    !isDownloading &&
    finishedCount.value === images.length &&
    (!failed.value.length || skipFailed.value),
);
</script>

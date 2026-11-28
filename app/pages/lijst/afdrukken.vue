<template>
  <div class="print-page">
    <PrintToolbar
      v-model:columns="columns"
      v-model:orientation="orientation"
      :disabled="loading || !issues.length || !columns.length"
      :loading="preparing || renderingMaps"
      @print="print"
    />

    <v-progress-linear v-if="loading" indeterminate class="d-print-none" />
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      class="d-print-none"
    >
      {{ error }}
    </v-alert>
    <v-alert
      v-else-if="!issues.length"
      type="info"
      variant="tonal"
      class="d-print-none"
    >
      Er zijn geen onderwerpen geselecteerd. Selecteer ze in de lijst met de
      knop Afdrukken.
    </v-alert>

    <!-- On screen as wide as the printable part of the chosen paper. -->
    <div
      v-if="issues.length"
      ref="sheetRef"
      class="print-sheet"
      :class="`print-sheet--${orientation}`"
    >
      <header class="print-header">
        <h1>{{ heading }}</h1>
        <p>{{ issues.length }} onderwerpen · {{ printDate }}</p>
      </header>
      <PrintTable
        :issues="issues"
        :columns="columns"
        :map-images="mapImages"
        :rendering-maps="renderingMaps"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "sidebase-auth" });
useTitle("Onderwerpen afdrukken");

const { columns, isVisible } = usePrintColumns();
const { orientation } = usePrintOrientation();
const { issues, loading, error } = usePrintIssues();
const { mapImages, renderingMaps } = usePrintMapImages(issues, () =>
  isVisible("map"),
);
const { public: publicConfig } = useRuntimeConfig();

useHead(() => ({
  style: [
    {
      key: "print-page-size",
      textContent: `@media print { @page { size: A4 ${orientation.value}; margin: 12mm; } }`,
    },
  ],
}));

const heading = computed(() =>
  [publicConfig.organization?.name, "Onderwerpen"].filter(Boolean).join(" – "),
);
const printDate = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "long",
  timeZone: "Europe/Amsterdam",
}).format(new Date());

const sheetRef = useTemplateRef<HTMLElement>("sheetRef");
const preparing = ref(false);

// Waits for the images, so they are in the print.
async function print() {
  preparing.value = true;
  try {
    const images = [...(sheetRef.value?.querySelectorAll("img") ?? [])];
    await Promise.all(
      images.map((image) => image.decode().catch(() => undefined)),
    );
  } finally {
    preparing.value = false;
  }
  window.print();
}
</script>

<style scoped>
.print-page {
  padding: 16px;
}

/* A4 minus the 12mm margins */
.print-sheet {
  max-width: 100%;
}

.print-sheet--landscape {
  width: 273mm;
}

.print-sheet--portrait {
  width: 186mm;
}

.print-header h1 {
  font-size: 1.4rem;
  margin: 0;
}

.print-header p {
  margin: 0 0 12px;
  color: #555;
}

@media print {
  .print-page {
    padding: 0;
  }

  .print-sheet {
    width: auto;
  }
}
</style>

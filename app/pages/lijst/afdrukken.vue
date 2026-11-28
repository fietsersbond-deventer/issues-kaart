<template>
  <div class="print-page">
    <div class="print-toolbar d-print-none">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        :to="{ path: '/lijst', query: listQuery }"
      >
        Terug naar de lijst
      </v-btn>
      <v-chip-group
        v-model="columns"
        class="print-choice"
        multiple
        filter
        column
        aria-label="Kolommen"
      >
        <v-chip
          v-for="column in PRINT_COLUMNS"
          :key="column.value"
          :value="column.value"
          size="small"
          variant="outlined"
        >
          {{ column.title }}
        </v-chip>
      </v-chip-group>
      <v-btn-toggle
        v-model="orientation"
        class="print-choice"
        mandatory
        density="compact"
        variant="outlined"
        divided
        aria-label="Papierrichting"
      >
        <v-btn value="landscape" prepend-icon="mdi-crop-landscape" size="small">
          Liggend
        </v-btn>
        <v-btn value="portrait" prepend-icon="mdi-crop-portrait" size="small">
          Staand
        </v-btn>
      </v-btn-toggle>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-printer"
        :disabled="loading || !issues.length || !columns.length"
        :loading="preparing || renderingMaps"
        @click="print"
      >
        Afdrukken / PDF opslaan
      </v-btn>
    </div>

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
      class="print-sheet"
      :class="`print-sheet--${orientation}`"
    >
      <header class="print-header">
        <h1>{{ heading }}</h1>
        <p>{{ issues.length }} onderwerpen · {{ printDate }}</p>
      </header>

      <table ref="tableRef" class="print-table">
        <thead>
          <tr>
            <th
              v-for="column in visibleColumns"
              :key="column.value"
              :class="`print-col-${column.value}`"
            >
              {{ column.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Each cell links to the issue, so the whole row is clickable in the PDF;
               only the notes stay free for writing. -->
          <tr v-for="issue in issues" :key="issue.id">
            <td v-if="isVisible('id')" class="print-col-id">
              <a class="print-link" :href="issueLink(issue)">{{ issue.id }}</a>
            </td>
            <td v-if="isVisible('image')" class="print-col-image">
              <a class="print-link" :href="issueLink(issue)">
                <img
                  v-if="issue.imageUrl"
                  :src="thumbnailUrl(issue.imageUrl)"
                  :alt="issue.title"
                />
              </a>
            </td>
            <td v-if="isVisible('title')" class="print-col-title">
              <a class="print-link" :href="issueLink(issue)">
                <strong>{{ issue.title }}</strong>
                <span class="print-date">
                  Gewijzigd op {{ formatDate(issue.updated_at) }}
                </span>
                <span v-if="issue.excerpt" class="print-excerpt">
                  {{ issue.excerpt }}
                </span>
              </a>
            </td>
            <td v-if="isVisible('categories')" class="print-col-categories">
              <a class="print-link" :href="issueLink(issue)">
                <span
                  v-if="getCategory(issue)"
                  class="print-category"
                  :style="categoryStyle(getCategory(issue)!)"
                >
                  {{ getCategory(issue)!.name }}
                </span>
                <span v-for="tag in issue.tags" :key="tag" class="print-tag">
                  {{ getTag(tag).label || tag }}
                </span>
              </a>
            </td>
            <td v-if="isVisible('map')" class="print-col-map">
              <a class="print-link" :href="issueLink(issue)">
                <img
                  v-if="mapImages.get(issue.id)"
                  :src="mapImages.get(issue.id)"
                  :alt="`Kaartje van ${issue.title}`"
                />
                <v-progress-circular
                  v-else-if="renderingMaps"
                  indeterminate
                  size="24"
                  class="d-print-none"
                />
              </a>
            </td>
            <td v-if="isVisible('qr')" class="print-col-qr">
              <a class="print-link" :href="issueLink(issue)">
                <QrCode :value="issueLink(issue)" />
              </a>
            </td>
            <td v-if="isVisible('notes')" class="print-col-notes" />
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Legend } from "~~/shared/types/Legend";
import type { PrintIssue } from "~~/shared/types/Issue";
import { PRINT_COLUMNS } from "~/composables/usePrintColumns";
import { thumbnailUrl } from "~/utils/thumbnailUrl";

definePageMeta({ middleware: "sidebase-auth" });
useTitle("Onderwerpen afdrukken");

const { selectedIds } = usePrintSelection();
const { columns, isVisible } = usePrintColumns();
const { orientation } = usePrintOrientation();
useHead(() => ({
  style: [
    {
      key: "print-page-size",
      textContent: `@media print { @page { size: A4 ${orientation.value}; margin: 12mm; } }`,
    },
  ],
}));
const { listQuery } = useListQuery();
const { token } = useAuth();
const { getTag } = useTagsApi();
const { categories } = storeToRefs(useCategories());
const { public: publicConfig } = useRuntimeConfig();
const { origin } = useRequestURL();

const visibleColumns = computed(() =>
  PRINT_COLUMNS.filter((column) => isVisible(column.value)),
);
const heading = computed(() =>
  [publicConfig.organization?.name, "Onderwerpen"].filter(Boolean).join(" – "),
);

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "long",
  timeZone: "Europe/Amsterdam",
});
const printDate = dateFormat.format(new Date());
function formatDate(value: string) {
  const date = parseDbTimestamp(value);
  return date ? dateFormat.format(date) : "";
}

function issueLink(issue: PrintIssue) {
  return `${origin}/kaart/${issue.slug || issue.id}`;
}

function getCategory(issue: PrintIssue) {
  return categories.value?.find((legend) => legend.id === issue.legend_id);
}
function categoryStyle(legend: Legend) {
  return {
    backgroundColor: legend.color,
    color: getContrastColor(legend.color),
  };
}

const issues = ref<PrintIssue[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
// Map images by issue id, as data URLs.
const mapImages = ref(new Map<number, string>());

// The selection lives in sessionStorage, which is read after mounting.
onMounted(async () => {
  if (!selectedIds.value.length) {
    loading.value = false;
    return;
  }
  try {
    issues.value = await $fetch<PrintIssue[]>("/api/issues/print", {
      query: { ids: selectedIds.value.join(",") },
      headers: token.value
        ? { Authorization: `Bearer ${token.value.replace(/^Bearer\s+/i, "")}` }
        : undefined,
    });
  } catch (fetchError) {
    console.error("Failed to load issues for printing:", fetchError);
    error.value = "De onderwerpen konden niet worden geladen";
  } finally {
    loading.value = false;
  }
});

// Map images are made once, when the map column is shown.
const renderingMaps = ref(false);
watch(
  () => isVisible("map") && issues.value.length > 0,
  async (needsMaps) => {
    if (!needsMaps || renderingMaps.value || mapImages.value.size) return;
    renderingMaps.value = true;
    try {
      await renderIssueMapImages(
        issues.value.map((issue) => ({
          ...issue,
          legend: getCategory(issue)!,
        })),
        {
          onImage: (id, dataUrl) => {
            mapImages.value = new Map(mapImages.value).set(id, dataUrl);
          },
        },
      );
    } catch (renderError) {
      console.error("Failed to render map images:", renderError);
    } finally {
      renderingMaps.value = false;
    }
  },
);

const tableRef = useTemplateRef<HTMLTableElement>("tableRef");
const preparing = ref(false);

// Waits for the images, so they are in the print.
async function print() {
  preparing.value = true;
  try {
    const images = [...(tableRef.value?.querySelectorAll("img") ?? [])];
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
.print-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 16px;
}

.print-page {
  padding: 16px;
}

/* Chosen columns and orientation in yellow, like the active page button. */
.print-choice :deep(.v-chip--selected),
.print-choice :deep(.v-btn--active) {
  background-color: var(--fietsersbond-geel);
  border-color: transparent;
  color: rgb(var(--v-theme-on-surface));
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

.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

.print-table th,
.print-table td {
  border: 1px solid #bbb;
  padding: 4px 6px;
  vertical-align: top;
  text-align: left;
}

.print-table th {
  background: #f0f0f0;
}

.print-table thead {
  display: table-header-group;
}

.print-table tr {
  break-inside: avoid;
}

.print-col-id {
  width: 3em;
}

.print-col-image,
.print-col-map {
  width: 40mm;
}

.print-col-image img,
.print-col-map img {
  display: block;
  max-width: 40mm;
  max-height: 35mm;
  object-fit: contain;
}

.print-link {
  display: block;
  min-height: 100%;
  color: inherit;
  text-decoration: none;
}

.print-col-title strong,
.print-date,
.print-excerpt {
  display: block;
}

.print-date,
.print-excerpt {
  font-size: 9pt;
}

.print-date {
  color: #555;
}

.print-excerpt {
  margin-top: 2px;
}

.print-col-categories {
  width: 35mm;
}

.print-category,
.print-tag {
  display: inline-block;
  margin: 0 4px 4px 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 9pt;
}

.print-tag {
  border: 1px solid #999;
}

.print-col-qr {
  width: 25mm;
}

/* At least 30% of the width for writing notes. */
.print-col-notes {
  width: 30%;
}

@media print {
  /* Vuetify's d-print-none has no !important and loses to display: flex above. */
  .print-toolbar {
    display: none;
  }

  .print-page {
    padding: 0;
  }

  .print-sheet {
    width: auto;
  }

  .print-table th {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-category {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

<template>
  <!-- Each cell links to the issue, so the whole row is clickable in the PDF;
       only the notes stay free for writing. -->
  <tr class="print-row">
    <td v-if="isVisible('id')" class="print-col-id">
      <a class="print-link" :href="link">{{ issue.id }}</a>
    </td>
    <td v-if="isVisible('image')" class="print-col-image">
      <a class="print-link" :href="link">
        <img
          v-if="issue.imageUrl"
          :src="thumbnailUrl(issue.imageUrl)"
          :alt="issue.title"
        />
      </a>
    </td>
    <td v-if="isVisible('title')" class="print-col-title">
      <a class="print-link" :href="link">
        <strong>{{ issue.title }}</strong>
        <span class="print-date">Gewijzigd op {{ changedOn }}</span>
        <span v-if="issue.excerpt" class="print-excerpt">
          {{ issue.excerpt }}
        </span>
      </a>
    </td>
    <td v-if="isVisible('categories')" class="print-col-categories">
      <a class="print-link" :href="link">
        <!-- Same icons as CategoryChip and Tag, without their filter clicks. -->
        <span v-if="category" class="print-category" :style="categoryStyle">
          <AppIcon v-if="category.icon" :icon="category.icon" size="12" />
          {{ category.name }}
        </span>
        <span v-for="tag in tags" :key="tag.tag" class="print-tag">
          <AppIcon :icon="tag.icon || 'mdi-tag-outline'" size="12" />
          {{ tag.label || tag.tag }}
        </span>
      </a>
    </td>
    <td v-if="isVisible('map')" class="print-col-map">
      <a class="print-link" :href="link">
        <img
          v-if="mapImage"
          :src="mapImage"
          :alt="`Kaartje van ${issue.title}`"
        />
        <v-progress-circular
          v-else-if="renderingMap"
          indeterminate
          size="24"
          class="d-print-none"
        />
      </a>
    </td>
    <td v-if="isVisible('qr')" class="print-col-qr">
      <a class="print-link" :href="link">
        <QrCode :value="link" />
      </a>
    </td>
    <td v-if="isVisible('notes')" class="print-col-notes" />
  </tr>
</template>

<script setup lang="ts">
import type { PrintIssue } from "~~/shared/types/Issue";
import type { PrintColumn } from "~/composables/usePrintColumns";
import { thumbnailUrl } from "~/utils/thumbnailUrl";

const {
  issue,
  columns,
  mapImage,
  renderingMap = false,
} = defineProps<{
  issue: PrintIssue;
  /** The visible columns. */
  columns: PrintColumn[];
  mapImage?: string;
  renderingMap?: boolean;
}>();

const { getTag } = useTagsApi();
const { categories } = storeToRefs(useCategories());
const { origin } = useRequestURL();

function isVisible(column: PrintColumn) {
  return columns.includes(column);
}

const link = computed(() => `${origin}/kaart/${issue.slug || issue.id}`);

// A fixed time zone keeps server and client rendering the same date.
const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "long",
  timeZone: "Europe/Amsterdam",
});
const changedOn = computed(() => {
  const date = parseDbTimestamp(issue.updated_at);
  return date ? dateFormat.format(date) : "";
});

const tags = computed(() => issue.tags.map((tag) => getTag(tag)));

const category = computed(() =>
  categories.value?.find((legend) => legend.id === issue.legend_id),
);
const categoryStyle = computed(() =>
  category.value
    ? {
        backgroundColor: category.value.color,
        color: getContrastColor(category.value.color),
      }
    : undefined,
);
</script>

<style scoped>
.print-row {
  break-inside: avoid;
}

.print-row td {
  border: 1px solid #bbb;
  padding: 4px 6px;
  vertical-align: top;
  text-align: left;
}

.print-link {
  display: block;
  min-height: 100%;
  color: inherit;
  text-decoration: none;
}

.print-col-image img,
.print-col-map img {
  display: block;
  max-width: 40mm;
  max-height: 35mm;
  object-fit: contain;
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

.print-category,
.print-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin: 0 4px 4px 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 9pt;
}

.print-tag {
  border: 1px solid #999;
}

@media print {
  .print-category {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

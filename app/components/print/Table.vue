<template>
  <table class="print-table">
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
      <PrintIssueRow
        v-for="issue in issues"
        :key="issue.id"
        :issue="issue"
        :columns="columns"
        :map-image="mapImages.get(issue.id)"
        :rendering-map="renderingMaps"
      />
    </tbody>
  </table>
</template>

<script setup lang="ts">
import type { PrintIssue } from "~~/shared/types/Issue";
import type { PrintColumn } from "~/composables/usePrintColumns";
import { PRINT_COLUMNS } from "~/composables/usePrintColumns";

const { columns, renderingMaps = false } = defineProps<{
  issues: PrintIssue[];
  /** The visible columns, in print order. */
  columns: PrintColumn[];
  mapImages: Map<number, string>;
  renderingMaps?: boolean;
}>();

const visibleColumns = computed(() =>
  PRINT_COLUMNS.filter((column) => columns.includes(column.value)),
);
</script>

<style scoped>
.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

.print-table th {
  border: 1px solid #bbb;
  padding: 4px 6px;
  text-align: left;
  vertical-align: top;
  background: #f0f0f0;
}

.print-table thead {
  display: table-header-group;
}

/* Column widths; the title column gets the rest. */
.print-col-id {
  width: 3em;
}

.print-col-image,
.print-col-map {
  width: 40mm;
}

.print-col-categories {
  width: 35mm;
}

.print-col-qr {
  width: 25mm;
}

/* At least 30% of the width for writing notes. */
.print-col-notes {
  width: 30%;
}

@media print {
  .print-table th {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

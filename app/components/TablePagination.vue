<template>
  <nav class="table-pagination" aria-label="Paginering">
    <v-pagination
      v-model="page"
      :length="pageCount"
      :total-visible="7"
      show-first-last-page
    />
    <div class="table-pagination__size">
      <span>{{ range }}</span>
      <v-select
        v-model="itemsPerPage"
        :items="pageSizeOptions"
        aria-label="Aantal per pagina"
        density="compact"
        variant="outlined"
        hide-details
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
const { totalItems, pageSizeOptions = [5, 10, 25, 50] } = defineProps<{
  totalItems: number;
  pageSizeOptions?: number[];
}>();

const page = defineModel<number>("page", { required: true });
const itemsPerPage = defineModel<number>("itemsPerPage", { required: true });

const pageCount = computed(() =>
  Math.max(1, Math.ceil(totalItems / itemsPerPage.value)),
);
const range = computed(() => {
  if (totalItems === 0) return "0 van 0";
  const first = (page.value - 1) * itemsPerPage.value + 1;
  const last = Math.min(page.value * itemsPerPage.value, totalItems);
  return `${first}–${last} van ${totalItems}`;
});
</script>

<style>
/* Equal side columns keep the page buttons centred; page size on the right. */
.table-pagination {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.table-pagination .v-pagination {
  grid-column: 2;
}

.table-pagination__size {
  grid-column: 3;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 960px) {
  .table-pagination {
    grid-template-columns: 1fr;
  }

  .table-pagination .v-pagination,
  .table-pagination__size {
    grid-column: 1;
    justify-self: center;
  }
}

.table-pagination__size .v-select {
  width: 100px;
}
</style>

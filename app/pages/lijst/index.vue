<!-- eslint-disable vue/valid-v-slot -->
<template>
  <div>
    <v-card class="mb-4">
      <v-card-title v-if="!isPrinting" class="d-flex align-center" style="gap: 16px">
        <v-text-field
          v-model="state.search"
          label="Zoek"
          dense
          hide-details
          clearable
        />
      </v-card-title>
      <v-card-text>
        <v-data-table
          v-model:page="state.page"
          v-model:sort-by="state.sortBy"
          :items-per-page="isPrinting ? 9999 : state.itemsPerPage"
          :headers="headers"
          :items="filteredIssues"
          item-value="id"
          class="elevation-1"
          density="compact"
          :loading="!issues.length"
          @click:row="gotoIssue"
          :items-per-page-options="[5, 10, 25, 50]"
          show-current-page
        >
          <template #item.imageUrl="{ item }">
            <img v-if="item.imageUrl" :src="item.imageUrl" class="thumbnail"></img>           
          </template>

          <template #item.legend="{ item }">
            <category-chip :legend="item.legend" />           
          </template>


          <template #item.actions="{ item }">
            <div> 
              <template>
                <v-btn
                  :to="`/kaart/${item.id}`"
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click.stop
                >
                  <v-icon>mdi-arrow-right</v-icon>
                  <v-tooltip activator="parent" location="top">
                    Bekijk issue in de kaart
                  </v-tooltip>
                </v-btn>
              </template>
            </div>
          </template></v-data-table
        >
      </v-card-text>
    </v-card>

  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import CategoryChip from '~/components/CategoryChip.vue';
import type { Issue } from '~/types/Issue';
import type { Legend } from '~/types/Legend';

useTitle("Onderwerpen");

const isPrinting = useMediaQuery('print')

// Use lightweight issues for admin list (only id, title, legend_id, created_at)
const issuesStore = useIssues({
  fields: "id,title,legend_id,created_at,imageUrl",
});
const { issues } = storeToRefs(issuesStore);

const existingIssues = computed(() => issues.value || []);

function gotoIssue(_, { item }: { item: Issue }) {
  console.log(item);
  navigateTo(`/kaart/${item.id}`)
}

// Persistent state management using Nuxt's useState
const state = useState("issues-state", () => ({
  search: "",
  page: 1,
  itemsPerPage: 10,
  sortBy: [{ key: "created_at", order: "desc" }] as {
    key: string;
    order: "asc" | "desc";
  }[],
}));

// Reset pagination when search changes
watch(
  () => state.value.search,
  (newSearch, oldSearch) => {
    if (newSearch !== oldSearch) {
      state.value.page = 1;
    }
  }
);

const filteredIssues = computed(() => {
  return existingIssues.value.filter(
    (issue) =>
      !state.value.search ||
      issue.id.toString().includes(state.value.search) ||
      issue.title.toLowerCase().includes(state.value.search.toLowerCase()) ||
      issue.legend.name
        ?.toLowerCase()
        .includes(state.value.search.toLowerCase())

  );
});

function sortCategory(a: Legend, b: Legend) {
  return a.name.localeCompare(b.name);
}

const headers = computed(() => {
  return  [

    {title: "", value:"imageUrl", sortable: false},
    { title: "Titel", value: "title", sortable: true, width: "50%" },
    { title: "Categorie", value: "legend", sort: sortCategory },
  ];
});

</script>

<style>
.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

/* Make locked rows completely unclickable */
.locked-row {
  pointer-events: none !important;
  opacity: 0.6;
  user-select: none;
}

/* Re-enable pointer events only for allowed interactive elements */
.locked-row .lock-icon-container {
  pointer-events: auto !important;
}

.thumbnail {
  max-width: 100px;
  max-height: 100px;
  display: block;
  margin: 0.5rem auto 0.5rem auto;
  text-align: center;
}

</style>

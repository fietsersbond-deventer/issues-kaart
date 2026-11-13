<!-- eslint-disable vue/valid-v-slot -->
<template>
  <v-card class="mb-4">
    <v-card-title
      v-if="!isPrinting"
      class="d-flex align-center"
      style="gap: 16px"
    >
      <v-text-field
        v-model="search"
        label="Zoek"
        dense
        hide-details
        clearable
      />
    </v-card-title>
    <v-card-text>
      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="items"
        :items-length="totalItems"
        item-value="id"
        class="elevation-1"
        density="compact"
        :loading="pending"
        :items-per-page-options="[5, 10, 25, 50]"
        show-current-page
        @click:row="onRowClick"
      >
        <template #item.imageUrl="{ item }">
          <NuxtLink :to="issueURL(item)">
            <v-img
              v-if="item.imageUrl"
              :src="thumbnailUrl(item.imageUrl)"
              class="thumbnail"
              :height="100"
              width="fit-content"
            >
              <template #placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-progress-circular
                    color="grey-lighten-4"
                    indeterminate
                  ></v-progress-circular>
                </div>
              </template>
            </v-img>
          </NuxtLink>
        </template>

        <template #item.legend="{ item }">
          <NuxtLink :to="issueURL(item)">
            <div class="legend-grid">
              <CategoryChip v-if="item.legend" :legend="item.legend" />
              <Tag v-for="tag in item.tags" :key="tag" :tag="getTag(tag)" />
            </div>
          </NuxtLink>
        </template>

        <!-- emphasizeFilter escapes all result text before adding mark tags. -->
        <!-- eslint-disable vue/no-v-html -->
        <template #item.title="{ item }">
          <NuxtLink :to="issueURL(item)">
            <template v-if="item.snippets?.length">
              <b v-html="emphasizeFilter(item.title)" />
              <div
                v-for="snippet in item.snippets"
                :key="snippet"
                v-html="emphasizeFilter(snippet)"
              />
            </template>
            <template v-else>
              <span v-html="emphasizeFilter(item.title)" />
            </template>
          </NuxtLink>
        </template>
        <!-- eslint-enable vue/no-v-html -->

        <template #item.actions="{ item }">
          <div class="issue-actions">
            <v-btn
              v-if="!item.isConnected"
              icon
              variant="text"
              color="error"
              size="small"
              disabled
              :aria-label="`${item.title}: verbinding verbroken`"
            >
              <v-icon>mdi-wifi-off</v-icon>
              <v-tooltip activator="parent" location="top">
                Verbinding verbroken - bewerken en verwijderen is niet mogelijk
              </v-tooltip>
            </v-btn>
            <v-btn
              v-else-if="item.isLockedByOther"
              icon
              variant="text"
              color="warning"
              size="small"
              :aria-label="`${item.title} bewerkt door ${item.isLockedByOther}`"
              @click.stop
            >
              <v-icon>mdi-lock-outline</v-icon>
              <v-tooltip activator="parent" location="top">
                Dit issue wordt momenteel bewerkt door
                {{ item.isLockedByOther }}
              </v-tooltip>
            </v-btn>
            <span v-if="!item.canEdit" aria-hidden="true" />
            <template v-else>
              <v-btn
                icon="mdi-pencil"
                variant="text"
                color="primary"
                size="small"
                :aria-label="`${item.title} bewerken`"
                @click.stop="emit('edit', item)"
              />
              <v-btn
                icon="mdi-delete"
                variant="text"
                color="error"
                size="small"
                :aria-label="`${item.title} verwijderen`"
                @click.stop="emit('delete', item)"
              />
            </template>
            <v-btn
              icon="mdi-information-outline"
              variant="text"
              size="small"
              :aria-label="`Informatie over ${item.title}`"
              @click.stop="emit('info', item)"
            />
            <v-badge
              :content="item.comment_count ?? 0"
              :model-value="(item.comment_count ?? 0) > 0"
              color="primary"
              offset-x="8"
              offset-y="8"
            >
              <v-btn
                icon="mdi-comment-outline"
                variant="text"
                size="small"
                :aria-label="`Opmerkingen bij ${item.title}`"
                @click.stop="emit('comments', item)"
              />
            </v-badge>
          </div>
        </template>
      </v-data-table-server>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import CategoryChip from "~/components/CategoryChip.vue";
import type { IssueEditAvailability } from "~/composables/useIssueLocks";
import type { IssueSearchItem } from "~/types/IssueSearch";
import { thumbnailUrl } from "~/utils/thumbnailUrl";

type IssueSearchRow = IssueSearchItem & IssueEditAvailability;

defineProps<{
  items: IssueSearchRow[];
  totalItems: number;
  pending: boolean;
  emphasizeFilter: (text: string) => string;
}>();
const emit = defineEmits<{
  rowClick: [event: Event, item: IssueSearchItem];
  edit: [item: IssueSearchItem];
  delete: [item: IssueSearchItem];
  info: [item: IssueSearchItem];
  comments: [item: IssueSearchItem];
}>();

const page = defineModel<number>("page", { required: true });
const itemsPerPage = defineModel<number>("itemsPerPage", { required: true });
const search = defineModel<string>("search", { required: true });
const { status } = useAuth();
const { getTag } = useTagsApi();
const isPrinting = useMediaQuery("print");
const headers = computed(() => {
  const columns = [
    { title: "", value: "imageUrl", sortable: false, minWidth: 150 },
    { title: "", value: "title", sortable: false },
    { title: "", value: "legend", sortable: false, width: "20em" },
  ];
  if (status.value === "authenticated") {
    columns.push({
      title: "Acties",
      value: "actions",
      sortable: false,
      width: "180px",
    });
  }
  return columns;
});

function issueURL(item: IssueSearchItem) {
  return `/kaart/${item.slug || item.id}`;
}

function onRowClick(event: Event, { item }: { item: IssueSearchItem }) {
  emit("rowClick", event, item);
}
</script>

<style>
.thumbnail {
  display: block;
  margin: 0.5rem auto;
  text-align: center;
}

.legend-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.issue-actions {
  display: grid;
  grid-template-columns: repeat(4, 40px);
  align-items: center;
  gap: 4px;
}
</style>

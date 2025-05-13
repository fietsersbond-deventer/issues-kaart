<template>
  <div>
    <v-toolbar v-if="status === 'authenticated'">
      <Toolbar />
    </v-toolbar>

    <div v-if="issue" class="pa-4">
      <template v-if="issue.id">
        <div class="d-flex align-center mb-4">
          <h2 class="text-h5 mr-4">{{ issue.title }}</h2>
          <v-btn
            v-if="status === 'authenticated'"
            icon="mdi-pencil"
            variant="text"
            @click="showEditDialog = true"
          />
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="issue.description" />

        <v-dialog v-model="showEditDialog" max-width="800px">
          <EditForm v-model="issue" v-model:dialog="showEditDialog" />
        </v-dialog>
      </template>
      <EditForm v-else v-model="issue" :is-new="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Issue } from "~/types/Issue";

const route = useRoute();
const { id } = route.params;
const { status } = useAuth();
const showEditDialog = ref(false);

const { get } = useIssueApi();
const issue = ref<Issue | null>(null);

const reactiveFeature = useEditableFeature().inject();

if (!id) {
  // Redirect to new item creation
  navigateTo("/kaart");
} else if (typeof id !== "string") {
  // Handle invalid id type
  navigateTo("/kaart");
} else if (id === "new") {
  issue.value = {
    id: "",
    title: "",
    description: "",
    color: "#2196F3",
    geometry: reactiveFeature.feature.value?.geometry || {
      type: "Point",
      coordinates: [0, 0],
    },
  };
} else {
  // Fetch existing item
  const data = await get(id as string);
  if (!data) {
    issue.value = null;
    // Handle issue not found
    navigateTo("/kaart");
  } else {
    issue.value = data;
  }
}
</script>

<template>
  <div>
    <v-toolbar v-if="status === 'authenticated'">
      <Toolbar>
        <v-btn
          v-if="status === 'authenticated'"
          :icon="!isEditing ? 'mdi-pencil' : 'mdi-pencil-remove'"
          variant="text"
          @click="isEditing = !isEditing"
        />
        <v-btn
          v-if="isEditing"
          icon="mdi-fullscreen"
          variant="text"
          @click="
            showEditDialog = !showEditDialog;
            isEditing = false;
          "
        />
      </Toolbar>
    </v-toolbar>

    <div v-if="issue" class="pa-4">
      <template v-if="issue.id">
        <h2 class="text-h5 mb-4">{{ issue.title }}</h2>

        <template v-if="isEditing">
          <EditForm
            v-model="issue"
            :is-new="false"
            @save="isEditing = false"
            @cancel="isEditing = false"
          />
        </template>
        <div v-else v-html="issue.description" />
      </template>
      <template v-else>
        <h2 class="text-h5 mb-4">New Issue</h2>
        <template v-if="isEditing">
          <EditForm
            v-model="issue"
            :is-new="true"
            @save="isEditing = false"
            @cancel="isEditing = false"
          />
        </template>
        <div v-else>Click the edit button to create a new issue</div>
      </template>

      <v-dialog
        v-model="showEditDialog"
        max-width="800px"
        scrollable
        :fullscreen="$vuetify.display.mobile"
      >
        <EditForm
          v-model="issue"
          v-model:dialog="showEditDialog"
          :is-new="!issue.id"
          @save="showEditDialog = false"
          @cancel="showEditDialog = false"
        />
      </v-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Issue } from "~/types/Issue";

const route = useRoute();
const { id } = route.params;
const { status } = useAuth();
const showEditDialog = ref(false);
const isEditing = ref(false);

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

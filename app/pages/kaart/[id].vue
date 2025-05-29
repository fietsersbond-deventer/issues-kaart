<template>
  <div class="wrapper">
    <v-toolbar v-if="status === 'authenticated'">
      <Toolbar>
        <v-btn
          v-if="status === 'authenticated'"
          :icon="!isEditing ? 'mdi-pencil' : 'mdi-pencil-remove'"
          variant="text"
          @click="toggleEditing()"
        />
        <v-btn
          v-if="isEditing"
          icon="mdi-fullscreen"
          variant="text"
          @click="
            showEditDialog = !showEditDialog;
            setEditing(false);
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
            @save="setEditing(false)"
            @cancel="setEditing(false)"
          />
        </template>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-else v-html="issue.description" />
      </template>
      <template v-else>
        <h2 class="text-h5 mb-4">Nieuw project</h2>
        <template v-if="isEditing">
          <EditForm
            v-model="issue"
            :is-new="true"
            @save="setEditing(false)"
            @cancel="setEditing(false)"
          />
        </template>
        <div v-else>Klik op de edit knop om een nieuw issue toe te voegen</div>
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
const { isEditing, setEditing, toggleEditing } = useIsEditing();

const { get } = useIssueApi();
const issue = ref<Issue | null>(null);

const reactiveFeature = useEditableFeature().inject();

if (!id) {
  // Redirect to new item creation
  navigateTo("/kaart");
} else if (typeof id !== "string") {
  // Handle invalid id type
  navigateTo("/kaart");
} else if (id === "new" || id === "undefined") {
  setEditing(true);
  issue.value = {
    title: "",
    description: "",
    legend_id: null,
    geometry: reactiveFeature.feature.value?.geometry || {
      type: "Point",
      coordinates: [0, 0],
    },
  };
} else {
  // Fetch existing item
  const data = await get(id);
  if (!data) {
    issue.value = null;
    // Handle issue not found
    navigateTo("/kaart");
  } else {
    issue.value = data;
  }
}

definePageMeta({
  pageTransition: {
    name: "page",
  },
});
</script>

<style>
.wrapper {
  position: relative;
  width: 100%;
  min-height: 100%;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease;
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.page-enter-to,
.page-leave-from {
  opacity: 1;
}
</style>

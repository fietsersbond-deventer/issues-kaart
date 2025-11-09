<template>
  <div class="wrapper">
    <v-toolbar v-if="status === 'authenticated'">
      <Toolbar>
        <template v-if="!isEditing">
          <v-btn v-if="!isConnected" variant="text" color="error" disabled>
            <v-icon>mdi-wifi-off</v-icon>
            <v-tooltip activator="parent" location="top">
              Verbinding verbroken - bewerken is niet mogelijk
            </v-tooltip>
          </v-btn>

          <v-btn v-else-if="!!isLockedByOther" variant="text" color="warning">
            <v-icon>mdi-lock-outline</v-icon>
            <v-tooltip activator="parent" location="top">
              Dit issue wordt momenteel bewerkt door {{ isLockedByOther }}
            </v-tooltip>
          </v-btn>

          <v-btn
            v-else
            icon="mdi-pencil"
            variant="text"
            :disabled="!isConnected"
            @click="safeToggleEditing()"
          />
        </template>
        <template v-else>
          <v-btn
            icon="mdi-pencil-remove"
            variant="text"
            @click="safeToggleEditing()"
          />
          <v-btn
            icon="mdi-fullscreen"
            variant="text"
            @click="showEditDialog = !showEditDialog"
          />
        </template>
      </Toolbar>
    </v-toolbar>

    <div v-if="issue" class="pa-4">
      <template v-if="'id' in issue">
        <EditForm
          v-if="isEditing"
          v-model="issue"
          :is-new="false"
          @save="setEditing(false)"
          @cancel="setEditing(false)"
        />
        <template v-else>
          <h1 class="mb-4">{{ issue.title }}</h1>
          <v-chip
            :style="{ marginLeft: '12px' }"
            label
            variant="flat"
            size="small"
            :color="issue.legend.color"
            :text-color="getContrastColor(issue.legend.color)"
            >{{ issue.legend.name }}</v-chip
          >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="ql-editor viewer" v-html="issue.description" />
        </template>
      </template>
      <template v-else>
        <template v-if="isEditing">
          <EditForm
            v-model="issue"
            :is-new="true"
            @save="setEditing(false)"
            @cancel="setEditing(false)"
          />
        </template>
        <div v-else>
          Klik op de edit knop om een nieuw onderwerp toe te voegen
        </div>
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
import { isExistingIssue } from "@/types/Issue";

const route = useRoute("kaart-id");
const { id } = route.params;
const { status } = useAuth();
const showEditDialog = ref(false);
const { isEditing, setEditing, toggleEditing } = useIsEditing();
const { issue } = storeToRefs(useSelectedIssue());
const { isLockedByOther } = storeToRefs(useIssueLocks());
const { isConnected } = useConnectionStatus();

// Safe toggle function that checks connection
function safeToggleEditing() {
  // Prevent starting edit mode when connection is unsafe
  if (!isEditing.value && !isConnected.value) {
    return;
  }
  toggleEditing();
}

watch(issue, () => {
  if (isExistingIssue(issue.value)) {
    useIssueOpenGraph(issue.value);
  }
});

// Update route meta for breadcrumbs and page title
watch(
  () => issue.value?.title,
  (newTitle) => {
    const title = newTitle || "Nieuw onderwerp";
    route.meta.title = title;
    // Also update browser tab title synchronously
    useHead({
      title: `${title} - Fietsersbond Deventer`,
    });
  },
  { immediate: true }
);

if (!id || typeof id !== "string") {
  navigateTo("/kaart");
} else if (id === "new") {
  setEditing(true);
}

onUnmounted(() => {
  setEditing(false);
});

// watch([issue, id], ([newIssue, newId]) => {
//   if (newId && newId !== "new" && newIssue === undefined) {
//     // If the issue was not found, redirect to the main map page
//     navigateTo("/kaart");
//   }
// });

definePageMeta({
  // Title is set dynamically via route.meta.title watcher below
});
</script>

<style>
.wrapper {
  position: relative;
  width: 100%;
  min-height: 100%;
}

.ql-editor.viewer img {
  width: 100% !important;
  height: auto;
}
</style>

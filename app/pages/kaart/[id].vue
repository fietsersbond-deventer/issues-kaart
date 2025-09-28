<template>
  <div class="wrapper">
    <v-toolbar v-if="status === 'authenticated'">
      <Toolbar>
        <template v-if="!isEditing">
          <v-btn v-if="!!isLockedByOther" variant="text" color="warning">
            <v-icon>mdi-lock-outline</v-icon>
            <v-tooltip activator="parent" location="top">
              Dit issue wordt momenteel bewerkt door {{ isLockedByOther }}
            </v-tooltip>
          </v-btn>

          <v-btn
            v-else
            icon="mdi-pencil"
            variant="text"
            @click="toggleEditing()"
          />
        </template>
        <template v-else>
          <v-btn
            icon="mdi-pencil-remove"
            variant="text"
            @click="toggleEditing()"
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
      <template v-if="issue.id">
        <EditForm
          v-if="isEditing"
          v-model="issue"
          :is-new="false"
          @save="setEditing(false)"
          @cancel="setEditing(false)"
        />
        <template v-else>
          <h1 class="mb-4">{{ issue.title }}</h1>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="ql-editor" v-html="issue.description" />
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
const route = useRoute("kaart-id");
const { id } = route.params;
const { status } = useAuth();
const showEditDialog = ref(false);
const { isEditing, setEditing, toggleEditing } = useIsEditing();
const { issue } = storeToRefs(useSelectedIssue());
const { isLockedByOther } = storeToRefs(useIssueLocks());

// Set the page title dynamically based on the issue
useHead(() => ({
  title: issue.value?.title
    ? `${issue.value.title} - Fietsersbond`
    : "Nieuw onderwerp - Fietsersbond",
}));

// Update route meta for breadcrumbs
watch(
  () => issue.value?.title,
  (newTitle) => {
    route.meta.title = newTitle || "Nieuw onderwerp";
  },
  { immediate: true }
);

if (!id || typeof id !== "string") {
  navigateTo("/kaart");
} else if (id === "new") {
  setEditing(true);
}

// watch([issue, id], ([newIssue, newId]) => {
//   if (newId && newId !== "new" && newIssue === undefined) {
//     // If the issue was not found, redirect to the main map page
//     navigateTo("/kaart");
//   }
// });

definePageMeta({
  title: "Kaart",
});
</script>

<style>
.wrapper {
  position: relative;
  width: 100%;
  min-height: 100%;
}
</style>

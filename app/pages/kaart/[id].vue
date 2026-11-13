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

          <v-btn
            v-else-if="isLockedByOther"
            :aria-label="`Bewerkt door ${isLockedByOther}`"
            variant="text"
            color="warning"
          >
            <v-icon>mdi-lock-outline</v-icon>
            <v-tooltip activator="parent" location="top">
              Dit issue wordt momenteel bewerkt door
              {{ isLockedByOther }}
            </v-tooltip>
          </v-btn>

          <v-btn
            v-else
            icon="mdi-pencil"
            variant="text"
            aria-label="Bewerken"
            @click="safeToggleEditing()"
          />
        </template>
        <template v-else>
          <v-btn
            icon="mdi-pencil-remove"
            variant="text"
            aria-label="Bewerken annuleren"
            @click="safeToggleEditing()"
          />
          <v-btn
            icon="mdi-fullscreen"
            variant="text"
            aria-label="Volledig scherm bewerken"
            @click="showEditDialog = !showEditDialog"
          />
        </template>
      </Toolbar>
    </v-toolbar>

    <v-alert v-if="loadError" type="error" class="ma-4">{{ loadError }}</v-alert>
    <div v-if="issue" class="pa-4">
      <template v-if="isExistingIssue(issue)">
        <EditForm
          v-if="isEditing"
          v-model="issue"
          :is-new="false"
          @save="setEditing(false)"
          @cancel="setEditing(false)"
        />
        <IssueDetails v-else ref="descriptionRef" :issue="issue" />
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
        <div v-else>Klik op de edit knop om een nieuw onderwerp toe te voegen</div>
      </template>

      <IssueEditDialog
        v-model:issue="issue"
        v-model:dialog="showEditDialog"
        :navigate-on-slug-change="true"
        :fullscreen="$vuetify.display.mobile"
        @save="showEditDialog = false"
        @cancel="showEditDialog = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { isExistingIssue } from "~~/shared/types/Issue";

const route = useRoute("kaart-id");
const { id } = route.params;
const { status } = useAuth();
const showEditDialog = ref(false);
const { isEditing, setEditing, toggleEditing } = useIsEditing();
const { issue, loadError } = storeToRefs(useSelectedIssue());
const { isConnected, isLockedByOther, canEdit } = useIssueEditAvailability(
  computed(() => (isExistingIssue(issue.value) ? issue.value.id : null))
);

// Safe toggle function that checks connection
function safeToggleEditing() {
  // Prevent starting edit mode when connection is unsafe
  if (!isEditing.value && !canEdit.value) {
    return;
  }
  toggleEditing();
}

const title = computed(() => issue.value?.title ?? "");
useTitle(title);
// Registreer de metadata tijdens setup, niet pas in een watcher na het laden.
// Alleen opgeslagen onderwerpen hebben een deelbare URL en afbeelding; concepten niet.
// De computed-bron volgt ook vervangingen door navigatie of WebSocket-berichten.
useIssueOpenGraph(computed(() => (isExistingIssue(issue.value) ? issue.value : null)));

if (!id || typeof id !== "string") {
  navigateTo("/kaart");
} else if (id === "new") {
  setEditing(true);
}

onUnmounted(() => {
  setEditing(false);
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

.desktop-layout .ql-editor.viewer img {
  cursor: pointer;
}
</style>

<template>
  <v-form
    v-if="issue"
    v-model="valid"
    class="edit-form"
    lazy-validation
    @submit.prevent="onSubmit"
  >
    <v-card class="edit-form-card">
      <v-card-actions>
        <v-spacer />
        <v-btn
          type="submit"
          color="primary"
          :disabled="!canSubmit"
          variant="flat"
          >Opslaan</v-btn
        >
        <v-btn color="secondary" variant="flat" @click="onCancel"
          >Annuleren</v-btn
        >
        <v-btn
          v-if="'id' in issue"
          color="error"
          variant="flat"
          @click="onDelete"
        >
          Verwijderen
        </v-btn>
      </v-card-actions>
      <v-card-text style="height: 100%">
        <v-container fluid class="pa-0">
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model.trim="issue.title"
                label="Titel"
                :rules="[(v: string) => !!v || 'Titel is verplicht']"
                required
                hide-details="auto"
                @blur="generateSlugOnBlur"
              />
              <div class="issue-url-editor">
                <div class="issue-url-control">
                  <span class="issue-url-prefix"
                    >{{ requestURL.origin }}/kaart/</span
                  >
                  <input
                    v-model.trim="issue.slug"
                    aria-label="URL-deel"
                    autocomplete="off"
                    spellcheck="false"
                    @input="onSlugInput"
                    @blur="checkSlugOnBlur"
                  />
                </div>
                <div
                  v-if="isGeneratingSlug"
                  class="issue-url-status"
                  role="status"
                >
                  Wachten tot de titel compleet is; de URL wordt over 2 seconden
                  of bij verlaten van het titelveld gegenereerd.
                </div>
                <div
                  v-else-if="isCheckingSlug"
                  class="issue-url-status"
                  role="status"
                >
                  URL controleren…
                </div>
                <div v-if="slugError" class="issue-url-error" role="alert">
                  {{ slugError }}
                </div>
              </div>
            </v-col>

            <v-col cols="12">
              <div class="mb-4">
                <div class="quill-editor-container">
                  <QuillEditor
                    ref="quillEditorRef"
                    v-model:content="issue.description"
                    content-type="html"
                    :toolbar="defaultQuillToolbar"
                    :modules="defaultQuillModules"
                    class="quill-editor"
                  />
                </div>
                <!-- Knop om de "Street View toevoegen"-dialoog te openen. Voegt
                     GEEN embed-HTML rechtstreeks in - dat gebeurt pas na een
                     geslaagde /api/streetview/parse-aanroep, zie script. -->
                <div class="d-flex justify-end mt-1">
                  <v-btn
                    size="small"
                    variant="text"
                    prepend-icon="mdi-google-street-view"
                    @click="openStreetViewDialog"
                  >
                    Street View toevoegen
                  </v-btn>
                </div>
                <div
                  v-if="!issue.description"
                  class="text-error text-caption mt-1"
                >
                  Beschrijving is verplicht
                </div>
              </div>
            </v-col>

            <v-col cols="12">
              <CategorySelect
                v-if="categories"
                v-model="issue.legend_id"
                :legends="categories"
                label="Categorie"
              />
            </v-col>

            <v-col cols="12">
              <TagSelect v-model="issue.tags" label="Tags" />
            </v-col>

            <!-- Hidden geometry validation field -->
            <v-col cols="12" style="display: none">
              <v-text-field
                v-model="geometryValidation"
                :rules="geometryRules"
                required
              />
            </v-col>

            <!-- Geometry validation message -->
            <v-col v-if="!issue.geometry" cols="12">
              <v-alert type="warning" variant="tonal" class="mb-0">
                Voeg een locatie toe op de kaart door te tekenen met de knoppen bovenin de
                kaart.
              </v-alert>
            </v-col>
          </v-row>
        </v-container>
        <!-- <pre>{{ issue.geometry }}</pre> -->
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          type="submit"
          color="primary"
          :disabled="!canSubmit"
          variant="flat"
          >Opslaan</v-btn
        >
        <v-btn color="secondary" variant="flat" @click="onCancel"
          >Annuleren</v-btn
        >
        <v-btn
          v-if="isExistingIssue(issue)"
          color="error"
          variant="flat"
          @click="onDelete"
        >
          Verwijderen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-form>

  <IssueDeleteDialog
    v-model="showDeleteDialog"
    :title="isExistingIssue(issue) ? issue.title : ''"
    :loading="deleting"
    @confirm="confirmDelete"
  />

  <StreetViewDialog
    v-model="showStreetViewDialog"
    @insert="insertStreetView"
  />
</template>

<script setup lang="ts">
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import StreetViewDialog from "./StreetViewDialog.vue";
import IssueDeleteDialog from "~/components/IssueDeleteDialog.vue";
import {
  isExistingIssue,
  type Issue,
  type NewIssue,
} from "~~/shared/types/Issue";
import { defaultQuillToolbar, defaultQuillModules } from "~/utils/quillConfig";
import {
  ensureStreetViewEmbedBlotRegistered,
  insertStreetViewIntoQuill,
  type StreetViewEmbedValue,
} from "~/utils/streetViewEmbedBlot";

// Start zo vroeg mogelijk met het laden van Quill en het registreren van onze
// eigen streetview-embed, nog vóórdat de editor hieronder gemount wordt. Zo is
// de registratie al klaar tegen de tijd dat de editor een eerder opgeslagen
// omschrijving (die mogelijk al zo'n embed bevat) gaat inlezen.
void ensureStreetViewEmbedBlotRegistered();

const valid = ref(true);
const props = defineProps<{ navigateOnSlugChange?: boolean }>();
const showDialog = defineModel<boolean>("dialog", { required: false });
const issue = defineModel<Issue | NewIssue>({ required: true });
const route = useRoute();
const requestURL = useRequestURL();
const {
  isGenerating: isGeneratingSlug,
  isChecking: isCheckingSlug,
  error: slugError,
  isValid: isSlugValid,
  onInput: onSlugInput,
  generateOnBlur: generateSlugOnBlur,
  checkOnBlur: checkSlugOnBlur,
} = useIssueSlug(issue);
const showDeleteDialog = ref(false);
const deleting = ref(false);
useIssueEditLock(
  computed(() => (issue.value && "id" in issue.value ? issue.value.id : null)),
);
const { canEdit: canEditByLock } = useIssueEditAvailability(
  computed(() => (issue.value && "id" in issue.value ? issue.value.id : null)),
);

const oldValue = { ...issue.value };
const isModified = computed(() => {
  return JSON.stringify(issue.value) !== JSON.stringify(oldValue);
});

// Geometry validation using Vuetify rules system
const geometryValidation = computed({
  get: () => (issue.value?.geometry ? "valid" : ""),
  set: () => {}, // No-op setter since this is read-only
});

const geometryRules = [
  (_v: string) =>
    !!issue.value?.geometry ||
    "Voeg een locatie toe op de kaart door te tekenen met de knoppen bovenin de kaart.",
];

// Only enable submit if form is valid (includes geometry validation) AND has modifications AND connection is active AND lock is still held
const canSubmit = computed(() => {
  return (
    valid.value &&
    isModified.value &&
    isConnected.value &&
    isSlugValid.value &&
    canEditByLock.value
  );
});

// Ref to the QuillEditor component instance, used to access the underlying Quill API
const quillEditorRef = ref<InstanceType<typeof QuillEditor> | null>(null);

// Status van de "Street View toevoegen"-dialoog.
const showStreetViewDialog = ref(false);

function openStreetViewDialog() {
  showStreetViewDialog.value = true;
}

async function insertStreetView(preview: StreetViewEmbedValue) {
  await insertStreetViewIntoQuill(
    quillEditorRef.value?.getQuill(),
    preview,
    (code) => {
      if (issue.value) {
        issue.value.description = `${issue.value.description ?? ""}${code}`;
      }
    },
  );
}

const { update, create, remove } = useIssuesMethods();
const { categories } = storeToRefs(useCategories());
const { isEditing } = useIsEditing();
const { isConnected } = useConnectionStatus();
const { trackEvent } = useMatomoTracking();
const { data: user } = useAuth();
const { refreshTags } = useTagsApi();

async function onSubmit() {
  // Prevent submission if connection is lost or lock is lost
  if (!isConnected.value || !isSlugValid.value || !canEditByLock.value) {
    return;
  }

  if (issue.value && valid.value) {
    const username = user.value?.name || "anonymous";
    if (isExistingIssue(issue.value)) {
      const updatedIssue = await update(issue.value.id, issue.value);
      await refreshTags();
      // Track issue modification in Matomo
      trackEvent(
        "Issue",
        "Modified",
        `Issue #${issue.value.id} by ${username}: ${issue.value.title}`,
      );
      if (updatedIssue.slug !== issue.value.slug) {
        issue.value.slug = updatedIssue.slug;
      }
      if (
        props.navigateOnSlugChange !== false &&
        updatedIssue.slug !== route.params.id
      ) {
        showDialog.value = false;
        return navigateTo({
          path: `/kaart/${updatedIssue.slug}`,
          query: route.query,
        });
      }
    } else {
      const result = await create(issue.value);
      await refreshTags();
      if (isExistingIssue(result)) {
        // Track issue creation in Matomo
        trackEvent(
          "Issue",
          "Created",
          `Issue #${result.id} by ${username}: ${result.title}`,
        );
        showDialog.value = false;
        return navigateTo(`/kaart/${result.slug}`);
      }
    }
  }
  isEditing.value = false;
  showDialog.value = false;
}

function onCancel() {
  issue.value = { ...oldValue };
  showDialog.value = false;
  isEditing.value = false;
}

async function onDelete() {
  if (isExistingIssue(issue.value)) showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (!isExistingIssue(issue.value)) return;

  deleting.value = true;
  try {
    const issueId = issue.value.id;
    const issueTitle = issue.value.title;
    const name = user.value?.name || "anonymous";
    await remove(issueId);
    trackEvent(
      "Issue",
      "Deleted",
      `Issue #${issueId} by ${name}: ${issueTitle}`,
    );
    showDeleteDialog.value = false;
    showDialog.value = false;
    return navigateTo("/kaart");
  } finally {
    deleting.value = false;
  }
}
</script>

<style>
.edit-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.edit-form-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.quill-editor-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.quill-editor-container .ql-toolbar.ql-snow {
  position: sticky !important;
  top: 0;
  z-index: 1;
  background-color: rgb(var(--v-theme-surface));
}

.quill-editor {
  height: 250px;
}

.issue-url-control {
  display: flex;
  align-items: center;
  min-height: 24px;
  font-size: 0.875rem;
}

.issue-url-editor {
  margin-top: 6px;
}

.issue-url-prefix {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
}

.issue-url-control input {
  flex: 1;
  min-width: 0;
  margin-left: 2px;
  padding: 2px 4px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.24);
  border-radius: 3px;
  color: rgb(var(--v-theme-on-surface));
  background: transparent;
  font: inherit;
}

.issue-url-control input:focus {
  border-color: rgb(var(--v-theme-primary));
  outline: 1px solid rgb(var(--v-theme-primary));
}

.issue-url-status,
.issue-url-error {
  min-height: 20px;
  padding-top: 4px;
  font-size: 0.75rem;
}

.issue-url-status {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.issue-url-error {
  color: rgb(var(--v-theme-error));
}

/* Force Quill editor to fit within container */
:deep(.ql-container) {
  height: calc(100% - 42px) !important; /* 42px is the toolbar height */
}
</style>

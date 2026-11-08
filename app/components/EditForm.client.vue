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
                    :toolbar
                    :modules="modules"
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
                Voeg een locatie toe op de kaart door te tekenen met de knoppen
                bovenin de kaart.
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

  <v-dialog v-model="showStreetViewDialog" max-width="600">
    <v-card>
      <v-card-title>Street View toevoegen</v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-2">
          Plak hier een Street View link (gebruik de Deel-knop in Google Maps
          terwijl je in Street View staat). Gewone kaartlocaties worden niet
          ondersteund.
        </p>
        <v-text-field
          v-model.trim="streetViewUrl"
          label="Street View link"
          :disabled="isParsing || !!parsedPreview"
          :error-messages="parseError ? [parseError] : []"
          spellcheck="false"
          @keydown.enter.prevent="fetchStreetViewPreview"
        />
        <div v-if="parsedPreview" class="text-center mt-2">
          <img
            :src="parsedPreview.previewDataUrl"
            alt="Street View voorvertoning"
            class="streetview-dialog-preview"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeStreetViewDialog">Annuleren</v-btn>
        <v-btn
          v-if="!parsedPreview"
          color="primary"
          variant="flat"
          :loading="isParsing"
          :disabled="!streetViewUrl.trim() || isParsing"
          @click="fetchStreetViewPreview"
        >
          Ophalen
        </v-btn>
        <v-btn v-else color="primary" variant="flat" @click="insertStreetView">
          Invoegen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import IssueDeleteDialog from "~/components/IssueDeleteDialog.vue";
import {
  isExistingIssue,
  type Issue,
  type NewIssue,
} from "~~/shared/types/Issue";
import { imageCompressor } from "quill-image-compress";
import {
  ensureStreetViewEmbedBlotRegistered,
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
const { update, create, remove } = useIssuesMethods();
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

const modules = [
  // {
  //   name: "blotFormatter",
  //   module: BlotFormatter,
  //   options: {
  //     /* options */
  //   },
  // },
  {
    name: "compress",
    module: imageCompressor,
    options: {
      quality: 0.7,
      maxWidth: 1000,
      maxHeight: 1000,
      imageType: "image/jpeg",
      debug: true,
      suppressErrorLogging: false,
      handleOnPaste: true,
      insertIntoEditor: undefined,
    },
  },
];

const toolbar = [
  [{ header: [2, 3, 4, false] }],
  ["bold", "italic"], // toggled buttons
  ["link", "image"],

  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
];

// Ref to the QuillEditor component instance, used to access the underlying Quill API
const quillEditorRef = ref<InstanceType<typeof QuillEditor> | null>(null);

// Status/inhoud van de "Street View toevoegen"-dialoog.
const showStreetViewDialog = ref(false);
// De ruwe, door de gebruiker geplakte deel-link.
const streetViewUrl = ref("");
// True zolang het /api/streetview/parse-verzoek loopt (voor de laad-indicator
// op de "Ophalen"-knop).
const isParsing = ref(false);
// Foutmelding van de server (of een generieke fallback), getoond onder het
// invoerveld.
const parseError = ref("");
// Resultaat van een geslaagde aanroep: bevat o.a. de al opgehaalde
// voorvertoning (previewDataUrl) en de kant-en-klare embed-URL (embedSrc).
// Zolang dit gevuld is, tonen we de voorvertoning + "Invoegen"-knop i.p.v. het
// invoerveld + "Ophalen"-knop.
const parsedPreview = ref<StreetViewEmbedValue | null>(null);

// Opent de dialoog met een schone lei (leeg veld, geen fout, geen eerdere
// voorvertoning).
function openStreetViewDialog() {
  streetViewUrl.value = "";
  parseError.value = "";
  parsedPreview.value = null;
  showStreetViewDialog.value = true;
}

function closeStreetViewDialog() {
  showStreetViewDialog.value = false;
}

// Wordt aangeroepen door de "Ophalen"-knop (of Enter in het invoerveld): stuurt
// de geplakte link naar de server, die de redirect(s) volgt, de gegevens uit de
// URL haalt en de voorvertoning éénmalig ophaalt. Er wordt hier nog NIETS
// opgeslagen - dat gebeurt pas bij "Invoegen" hieronder, en uiteindelijk pas
// echt in de database wanneer het hele issue wordt opgeslagen.
async function fetchStreetViewPreview() {
  const url = streetViewUrl.value.trim();
  if (!url || isParsing.value) {
    return;
  }

  isParsing.value = true;
  parseError.value = "";
  try {
    parsedPreview.value = await $fetch<StreetViewEmbedValue>(
      "/api/streetview/parse",
      {
        method: "POST",
        body: { url },
        headers: authHeaders.value,
      },
    );
  } catch (error) {
    parsedPreview.value = null;
    // Nuxt/ofetch geeft de JSON-body van de server-fout terug via `error.data`
    // - daarin zit de nette, Nederlandstalige foutmelding uit streetView.ts.
    const fetchError = error as { data?: { message?: string } };
    parseError.value =
      fetchError?.data?.message ?? "Kon de Street View link niet verwerken";
  } finally {
    isParsing.value = false;
  }
}

// Wordt aangeroepen door de "Invoegen"-knop, zodra er een geldige
// voorvertoning is opgehaald. Voegt de embed toe aan de Quill-inhoud.
async function insertStreetView() {
  const preview = parsedPreview.value;
  if (!preview) {
    return;
  }

  // insertEmbed (niet dangerouslyPasteHTML) is hier vereist: Quill bewaart
  // alleen elementen die het herkent als een geregistreerd blot. Een gewone
  // <div> met data-* attributen zou anders teruggebracht worden tot enkel de
  // binnenste <img> (zie streetViewEmbedBlot.ts voor de volledige uitleg).
  await ensureStreetViewEmbedBlotRegistered();
  const quill = quillEditorRef.value?.getQuill();
  if (quill) {
    const range = quill.getSelection(true) ?? {
      index: quill.getLength(),
      length: 0,
    };
    quill.insertEmbed(range.index, "streetviewEmbed", preview, "user");
    // Cursor achter de zojuist ingevoegde embed plaatsen.
    quill.setSelection(range.index + 1, 0, "user");
  } else if (issue.value) {
    // Fallback: voeg de equivalente HTML rechtstreeks toe als de Quill-instantie
    // (nog) niet beschikbaar is. Dit levert dezelfde structuur op als het blot
    // hierboven zou opbouwen, dus wordt bij het opnieuw openen van de editor
    // alsnog correct als embed herkend.
    const code =
      `<div class="streetview-embed" data-lat="${preview.lat}" ` +
      `data-lng="${preview.lng}" data-heading="${preview.heading}" ` +
      `data-pitch="${preview.pitch}" data-fov="${preview.fov}" ` +
      `data-pano-id="${preview.panoId}" data-embed-src="${preview.embedSrc}">` +
      `<img src="${preview.previewDataUrl}" alt="Street View voorvertoning" /></div>`;
    issue.value.description = `${issue.value.description ?? ""}${code}`;
  }

  showStreetViewDialog.value = false;
}

const { categories } = storeToRefs(useCategories());
const { isEditing } = useIsEditing();
const { isConnected } = useConnectionStatus();
const { trackEvent } = useMatomoTracking();
const { data: user, token } = useAuth();
const { refreshTags } = useTagsApi();

// Zelfde patroon als useIssuesMethods.ts: de server herkent een ingelogde
// gebruiker via een "Authorization: Bearer <token>"-header (geen cookies),
// dus die header moeten we hier ook zelf meesturen bij het aanroepen van
// /api/streetview/parse.
const authHeaders = computed(() => {
  if (!token.value) return undefined;
  const cleanToken = token.value.replace(/^Bearer\s+/i, "");
  return { Authorization: `Bearer ${cleanToken}` };
});

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

.quill-editor-container :deep(.ql-toolbar) {
  position: sticky;
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

.streetview-dialog-preview {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
}
</style>

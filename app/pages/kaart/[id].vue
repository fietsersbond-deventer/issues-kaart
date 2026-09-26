<template>
  <div class="wrapper">
    <v-toolbar v-if="status === 'authenticated'">
      <Toolbar>
        <template v-if="!isEditing">
          <v-btn v-if="!isConnected" variant="text" color="error" disabled>
            <v-icon icon="mdi-wifi-off" />
            <v-tooltip activator="parent" location="top">
              Verbinding verbroken - bewerken is niet mogelijk
            </v-tooltip>
          </v-btn>

          <v-btn v-else-if="!!isLockedByOther" variant="text" color="warning">
            <v-icon icon="mdi-lock-outline"></v-icon>
            <v-tooltip activator="parent" location="top">
              Dit issue wordt momenteel bewerkt door {{ isLockedByOther }}
            </v-tooltip>
          </v-btn>

          <v-btn
            v-else
            variant="text"
            :disabled="!isConnected"
            aria-label="Bewerken"
            @click="safeToggleEditing()"
          >
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="top"> Bewerken </v-tooltip>
          </v-btn>
        </template>
        <template v-else>
          <v-btn
            variant="text"
            aria-label="Bewerken annuleren"
            @click="safeToggleEditing()"
          >
            <v-icon>mdi-pencil-remove</v-icon>
            <v-tooltip activator="parent" location="top">
              Stop bewerken
            </v-tooltip>
          </v-btn>
          <v-btn
            variant="text"
            aria-label="Volledig scherm bewerken"
            @click="showEditDialog = !showEditDialog"
          >
            <v-icon icon="mdi-fullscreen"></v-icon>
            <v-tooltip activator="parent" location="top">
              Volledig scherm
            </v-tooltip>
          </v-btn>
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
          <ImageViewer>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              ref="descriptionRef"
              class="ql-editor viewer"
              v-html="issue.description"
              @click="onDescriptionClick"
            />
          </ImageViewer>
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
const { isConnected } = useConnectionStatus();

// Safe toggle function that checks connection
function safeToggleEditing() {
  // Prevent starting edit mode when connection is unsafe
  if (!isEditing.value && !isConnected.value) {
    return;
  }
  toggleEditing();
}

// if a link is relative, use navigateTo()
function handleLocalLinks(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const link = target.closest("a");
  const href = link?.getAttribute("href");
  if (
    !link ||
    !href ||
    /^[a-z][a-z\d+.-]*:/i.test(href) ||
    href.startsWith("//") ||
    href.startsWith("#")
  ) {
    return;
  }

  event.preventDefault();
  const destination = new URL(href, window.location.href);
  navigateTo(`${destination.pathname}${destination.search}${destination.hash}`);
}

const title = computed(() => issue.value?.title ?? "");
useTitle(title);

// Referentie naar de container waarin de omschrijving (via v-html) gerenderd
// wordt. Nodig omdat we daarna handmatig door de resulterende DOM moeten lopen
// (v-html-inhoud is voor Vue "onzichtbare" platte HTML, geen component-tree).
const descriptionRef = ref<HTMLElement | null>(null);
const {
  activate: activateStreetViewEmbeds,
  handleClick: handleStreetViewClick,
} = useStreetViewEmbeds();

// Eén gecombineerde click-handler op de omschrijving-container: zowel interne
// links (handleLocalLinks) als het "klik om Street View te laden"-gedrag
// worden op hetzelfde click-event afgehandeld.
function onDescriptionClick(event: MouseEvent) {
  handleLocalLinks(event);
  handleStreetViewClick(event);
}

// Bij eerste keer tonen: verrijk alle streetview-embeds in de zojuist
// gerenderde omschrijving met hun "klik om te laden"-knop.
onMounted(() => {
  if (descriptionRef.value) {
    activateStreetViewEmbeds(descriptionRef.value);
  }
});

// De omschrijving-<div> wordt conditioneel getoond/verborgen (bewerken vs.
// bekijken) en de inhoud kan wijzigen (na opslaan) - telkens wanneer dat
// gebeurt, moet de zojuist opnieuw gerenderde HTML weer verrijkt worden.
// flush: "post" zorgt ervoor dat dit pas draait NADAT Vue de DOM heeft
// bijgewerkt, zodat descriptionRef.value de nieuwe inhoud al bevat.
watch(
  () => [issue.value?.description, isEditing.value] as const,
  () => {
    if (descriptionRef.value) {
      activateStreetViewEmbeds(descriptionRef.value);
    }
  },
  { flush: "post" },
);

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

/* Wrapper-element voor een streetview-embed: bevat afwisselend de statische
   voorvertoning + knop, of (na een klik) het live Google-iframe. */
.streetview-embed {
  position: relative;
  display: block;
}

/* Zelfde beeldverhouding (8:5 = 640:400) als de server-side opgehaalde
   voorvertoning, zodat het live iframe na het klikken exact hetzelfde stukje
   van de panoramafoto laat zien (een afwijkende beeldverhouding zorgt voor een
   ander effectief gezichtsveld, ook bij identieke heading/pitch/fov). */
.streetview-embed iframe {
  width: 100%;
  height: auto;
  aspect-ratio: 8 / 5;
}

/* "Klik om Street View te laden"-overlay, precies over de voorvertoning heen. */
.streetview-load-btn {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  border: none;
  font: inherit;
  cursor: pointer;

  /* dit overrides een setting van quill-editor */
  white-space: initial;
}

.streetview-load-btn .warning {
  font-style: italic;
  font-size: x-small;
  display: block;
}

/* Zodra geladen wordt de knop door useStreetViewEmbeds.ts al helemaal uit de
   DOM verwijderd (replaceChildren) - deze regel is puur een extra vangnet. */
.streetview-embed[data-loaded="true"] .streetview-load-btn {
  display: none;
}
</style>

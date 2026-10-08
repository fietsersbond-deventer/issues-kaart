<template>
  <article>
    <h1 class="mb-4">{{ issue.title }}</h1>

    <div class="d-flex flex-wrap align-center ga-2 mb-4">
      <CategoryChip :legend="issue.legend" />

      <Tag v-for="tag in issue.tags" :key="tag" :tag="getTag(tag)" />
    </div>

    <ImageViewer>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        ref="descriptionRef"
        class="ql-editor viewer"
        v-html="issue.description"
        @click="onDescriptionClick"
      />
    </ImageViewer>
  </article>
</template>

<script setup lang="ts">
import type { Issue } from "~~/shared/types/Issue";

const props = defineProps<{
  issue: Issue;
}>();

const { getTag } = useTagsApi();

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
</script>
<style>
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

<template>
  <v-btn
    icon
    variant="text"
    class="flex-shrink-0 shareButton"
    aria-label="Deel dit onderwerp"
    @click="shareUrl"
  >
    <v-icon size="28">mdi-share-variant</v-icon>
    <v-tooltip activator="parent" location="top" text="Deel dit onderwerp" />
  </v-btn>
</template>

<script setup lang="ts">
import { useShare } from "@vueuse/core";

const props = defineProps<{
  title?: string;
  url?: string;
}>();

const { isSupported, share } = useShare();
const { showSuccess, showError } = useSnackbar();

async function shareUrl() {
  const url = props.url ?? window.location.href;

  try {
    if (isSupported.value) {
      await share({ title: props.title, url });
      return;
    }

    if (!navigator.clipboard?.writeText) {
      showError("Browser ondersteunt geen clipboard, kan URL niet kopiëren.");
      return;
    }

    await navigator.clipboard.writeText(url);
    showSuccess("URL gekopieerd!");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      return;
    }

    showError(
      isSupported.value
        ? "URL kon niet worden gedeeld."
        : "URL kon niet worden gekopieerd."
    );
  }
}
</script>

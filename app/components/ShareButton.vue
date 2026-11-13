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
const { showSuccess, showError, showPersistent } = useSnackbar();

async function shareUrl() {
  const url = props.url ?? window.location.href;
  const data = { title: props.title, url };
  let shareError = "";

  if (isSupported.value && navigator.canShare(data)) {
    try {
      await share(data);
      return;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.warn("Native sharing failed:", error);
      const name =
        typeof error === "object" && error !== null && "name" in error
          ? String(error.name)
          : "Error";
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : String(error);
      shareError = `Delen mislukt: ${name}: ${message}`;
    }
  }

  try {
    if (!navigator.clipboard?.writeText) {
      if (shareError) {
        showPersistent(
          `${shareError}. URL kopiëren is niet beschikbaar.`,
          "error",
        );
        return;
      }
      showError(
        isSupported.value
          ? "URL kon niet worden gedeeld."
          : "Browser ondersteunt geen clipboard, kan URL niet kopiëren.",
      );
      return;
    }

    await navigator.clipboard.writeText(url);
    showSuccess("URL gekopieerd!");
  } catch {
    if (shareError) {
      showPersistent(
        `${shareError}. URL kon ook niet worden gekopieerd.`,
        "error",
      );
    } else {
      showError("URL kon niet worden gekopieerd.");
    }
  }
}
</script>

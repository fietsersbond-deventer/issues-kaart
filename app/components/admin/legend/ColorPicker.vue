<template>
  <v-color-picker
    v-model="color"
    v-model:mode="mode"
    :swatches="swatches"
    show-swatches
    hide-canvas
    hide-inputs
    hide-mode-switch
    hide-sliders
    swatches-max-height="none"
  />
</template>

<script setup lang="ts">
import { CATEGORY_COLORS } from "~~/shared/utils/categoryColors";

/** Color picker limited to the allowed category colors. */
const color = defineModel<string>();
const mode = ref<"rgb" | "rgba" | "hsl" | "hsla" | "hex" | "hexa">("hexa");
const swatches = CATEGORY_COLORS.map((swatch) => [swatch]);
</script>

<template>
  <v-menu
    open-on-hover
    open-on-click
    location="top"
    max-width="40em"
    :close-on-content-click="false"
  >
    <template #activator="{ props }">
      <!-- stop events so the info button does not toggle the legend row -->
      <v-btn
        v-bind="props"
        icon="mdi-information"
        size="x-small"
        density="comfortable"
        variant="text"
        color="grey"
        :aria-label="`Toelichting ${name}`"
        @click.stop
        @keydown.enter.stop
        @keydown.space.stop
      />
    </template>
    <v-card class="pa-2">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="tooltip-content" v-html="description" />
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
const { name, description } = defineProps<{
  name: string;
  description: string;
}>();
</script>

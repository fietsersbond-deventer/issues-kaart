<template>
  <article>
    <h1 class="mb-4">{{ issue.title }}</h1>

    <div class="d-flex flex-wrap align-center ga-2 mb-4">
      <v-chip
        label
        variant="flat"
        size="small"
        :color="issue.legend.color"
        :text-color="getContrastColor(issue.legend.color)"
      >
        {{ issue.legend.name }}
      </v-chip>

      <v-chip
        v-for="tag in issue.tags"
        :key="tag"
        :to="`/kaart/tag/${tag}`"
        label
        variant="tonal"
        size="small"
        prepend-icon="mdi-tag-outline"
      >
        {{ tag }}
      </v-chip>
    </div>

    <ImageViewer>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="ql-editor viewer" v-html="issue.description" />
    </ImageViewer>
  </article>
</template>

<script setup lang="ts">
import type { Issue } from "~/types/Issue";

defineProps<{
  issue: Issue;
}>();
</script>
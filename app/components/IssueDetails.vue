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

      <Tag
        v-for="tag in issue.tags"
        :key="tag"
        :tag="getTag(tag)"
        :to="`/kaart?tag=${encodeURIComponent(tag)}`"
      />
    </div>

    <ImageViewer>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="ql-editor viewer" v-html="issue.description" />
    </ImageViewer>
  </article>
</template>

<script setup lang="ts">
import type { Issue } from "~~/shared/types/Issue";

const props = defineProps<{
  issue: Issue;
}>();

const { getTag } = useTagsApi();
</script>

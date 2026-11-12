<template>
  <div class="tooltip">
    <img v-if="image" :src="image" class="tooltip-img" />
    <span class="tooltip-title">{{ title }}</span>
    <Tag v-for="tag in visibleTags" :key="tag.tag" :tag="tag" class="mt-2" />
    <Tag v-if="overflowCount > 0" :tag="overflowTag" class="mt-2" />
  </div>
</template>

<script setup lang="ts">
import type { Feature } from "ol";
import type { Tag } from "~~/shared/types/Tag";
import { thumbnailUrl } from "~/utils/thumbnailUrl";

const props = defineProps<{ feature: Feature }>();
const { getTag } = useTagsApi();
const properties = computed(() => props.feature.getProperties());
const title = computed(() => properties.value.title || "Geen titel");
const image = computed(() => properties.value.imageUrl ? thumbnailUrl(properties.value.imageUrl) : null);
const tags = computed<Tag[]>(() => {
  const result: Tag[] = [];
  for (const slug of properties.value.tags) {
    const tag = getTag(slug);
    if (tag) result.push(tag);
  }
  return result;
});

// Show all three tags instead of replacing the last one with "+ 1".
const visibleTags = computed(() => tags.value.slice(0, tags.value.length === 3 ? 3 : 2));
const overflowCount = computed(() => tags.value.length - visibleTags.value.length);
const overflowTag = computed<Tag>(() => ({
  id: -1,
  tag: "",
  label: `+ ${overflowCount.value}`,
  description: null,
  icon: null,
}));
</script>

<style>
.tooltip {
  cursor: pointer;
  background-color: white;
  padding: 0.5rem;
  border-radius: 0.375rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  border: 1px solid #d1d5db;
  white-space: normal;
  max-width: 15em;
}

.tooltip-img {
  max-width: 100%;
  max-height: 200px;
  display: block;
  margin: 0 auto 0.5rem auto;
}

.tooltip-title {
  display: block;
  max-width: 15em;
  word-break: break-word;
  margin: 0 auto;
}
</style>

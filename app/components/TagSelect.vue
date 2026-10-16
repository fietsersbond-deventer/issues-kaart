<template>
  <v-combobox
    v-model="selected"
    :items="items"
    item-title="title"
    item-value="value"
    :return-object="false"
    :label="label"
    multiple
    chips
    closable-chips
    clearable
    hide-selected
  >
    <template #chip="{ item, props: chipProps }">
      <Tag :tag="resolveTag(item)" v-bind="chipProps" />
    </template>

    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template #title>
          <Tag :tag="resolveTag(item)" />
        </template>
      </v-list-item>
    </template>
  </v-combobox>
</template>

<script setup lang="ts">
import type { Tag } from "~~/shared/types/Tag";

const selected = defineModel<string[]>({ required: true });
defineProps<{ label?: string }>();

const { tags, getTag } = useTagsApi();

type Option = string | { title: string; value: string };

// Een nieuw ingetypte tag is een kale string; getTag maakt daar tijdelijk een Tag van
function resolveTag(option: Option): Tag {
  return getTag(typeof option === "string" ? option : option.value);
}

const items = computed(() =>
  tags.value.map((tag) => ({
    title: tag.label || tag.tag,
    value: tag.tag,
  }))
);
</script>

<template>
  <div class="pa-4">
    <h1 class="mb-4">Tag: {{ tag }}</h1>
    <p class="text-body-2 text-medium-emphasis">
      De kaart toont onderwerpen met deze tag.
    </p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute("kaart-tag-tag");
const tag = computed(() => route.params.tag);

useTitle(computed(() => `Tag: ${tag.value}`));
</script>
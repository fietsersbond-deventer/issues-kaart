<template>
  <Intro />
</template>

<script setup lang="ts">
const pageTitle = "Welkom";

definePageMeta({
  title: pageTitle,
});

useHead({
  title: `${pageTitle} - Fietsersbond Deventer`,
});
</script>

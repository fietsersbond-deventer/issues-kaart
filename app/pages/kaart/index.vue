<template>
  <Intro />
</template>

<script setup lang="ts">
useTitle("Welkom");

// Zonder canonical ziet Google elke filter-queryvariant (?categories=...) als
// losse duplicaten van /kaart zonder zelfgekozen canonieke versie.
const { origin } = useRequestURL();
useHead({
  link: [{ rel: "canonical", href: `${origin}/kaart` }],
});
</script>

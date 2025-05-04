<template>
  <h1>{{ params.id }}</h1>
</template>
<script setup lang="ts">
const { params } = useRoute("kaart-id");
</script>

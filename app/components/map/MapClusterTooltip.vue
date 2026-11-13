<template>
  <div class="tooltip">
    <span class="tooltip-title">
      {{ members.length }} punten<span v-if="category"> - {{ category }}</span>
    </span>
    <ul class="cluster-titles">
      <li v-for="(member, index) in members" :key="index">
        {{ member.get("title") || "Geen titel" }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { Feature } from "ol";

const props = defineProps<{ members: Feature[] }>();
const category = computed<string | undefined>(
  () => props.members[0]?.get("legend")?.name
);
</script>

<style scoped>
.cluster-titles {
  margin: 0.25rem 0 0;
  padding-left: 1.25rem;
  overflow-wrap: anywhere;
}
</style>

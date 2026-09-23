<template>
  <div class="pa-4 d-flex flex-column" style="height: 100%; position: relative">
    <div class="flex-grow-1">
      <v-card variant="flat" class="mb-4 pa-4">
        <div
          v-if="introText"
          class="intro-content ql-editor"
          v-html="introText.text"
        />
        <v-btn
          v-if="status === 'authenticated' && introText"
          v-tooltip:top="'Introductie bewerken'"
          class="mt-2"
          icon="mdi-pencil"
          variant="text"
          aria-label="Introductie bewerken"
          @click="isEditorOpen = true"
        />
      </v-card>
    </div>
    <TextEditorDialog v-model="isEditorOpen" :entry="introText" />
  </div>
</template>
<script setup lang="ts">
const { status } = useAuth();
const { getText } = useTexts();
const isEditorOpen = ref(false);
const introText = computed(() => getText("intro.content") ?? null);

useTitle("Welkom");
</script>

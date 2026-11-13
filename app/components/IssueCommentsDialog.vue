<template>
  <v-dialog v-model="dialog" max-width="700px" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Opmerkingen{{ title ? ` bij ${title}` : "" }}</span>
        <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
      </v-card-title>
      <v-divider />
      <v-card-text>
        <IssueComments v-if="issueId" :issue-id="issueId" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{
  issueId: number | null;
  title?: string;
}>();
const dialog = defineModel<boolean>({ required: true });
</script>

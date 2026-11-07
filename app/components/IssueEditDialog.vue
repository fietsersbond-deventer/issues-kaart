<template>
  <v-dialog
    v-model="dialog"
    max-width="800px"
    scrollable
    :fullscreen="fullscreen"
  >
    <v-card v-if="issue" :loading="loading">
      <EditForm
        :key="'id' in issue ? issue.id : 'new'"
        v-model="issue"
        v-model:dialog="dialog"
        :navigate-on-slug-change="navigateOnSlugChange"
        @save="emit('save')"
        @cancel="emit('cancel')"
      />
    </v-card>
    <v-card v-else-if="loading">
      <v-card-text class="d-flex justify-center pa-8">
        <v-progress-circular indeterminate />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Issue, NewIssue } from "~~/shared/types/Issue";

withDefaults(
  defineProps<{
    loading?: boolean;
    navigateOnSlugChange?: boolean;
    fullscreen?: boolean;
  }>(),
  {
    loading: false,
    navigateOnSlugChange: false,
    fullscreen: false,
  },
);
const emit = defineEmits<{ save: []; cancel: [] }>();
const issue = defineModel<Issue | NewIssue | null>("issue", { required: true });
const dialog = defineModel<boolean>("dialog", { required: true });
</script>

<template>
  <div class="issue-url-editor">
    <div class="issue-url-control">
      <span class="issue-url-prefix">{{ requestURL.origin }}/kaart/</span>
      <input
        v-model.trim="issue.slug"
        aria-label="URL-deel"
        autocomplete="off"
        spellcheck="false"
        @input="onInput"
        @blur="checkOnBlur"
      />
      <v-btn
        class="issue-url-regenerate"
        size="x-small"
        variant="text"
        icon="mdi-refresh"
        aria-label="URL opnieuw genereren op basis van de titel"
        title="URL opnieuw genereren op basis van de titel"
        :disabled="!issue.title?.trim() || isChecking"
        @click="regenerate"
      />
    </div>
    <div v-if="isGenerating" class="issue-url-status" role="status">
      Wachten tot de titel compleet is; de URL wordt over 2 seconden of bij
      verlaten van het titelveld gegenereerd.
    </div>
    <div v-else-if="isChecking" class="issue-url-status" role="status">
      URL controleren…
    </div>
    <div v-if="error" class="issue-url-error" role="alert">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Issue, NewIssue } from "~~/shared/types/Issue";

const issue = defineModel<Issue | NewIssue>({ required: true });
const valid = defineModel<boolean>("valid", { default: true });
const requestURL = useRequestURL();
const {
  isGenerating,
  isChecking,
  error,
  isValid,
  onInput,
  generateOnBlur,
  checkOnBlur,
  regenerate,
} = useIssueSlug(issue);

watch(
  isValid,
  (value) => {
    valid.value = value;
  },
  { immediate: true },
);

defineExpose({ generateOnBlur });
</script>

<style>
.issue-url-control {
  display: flex;
  align-items: center;
  min-height: 24px;
  font-size: 0.875rem;
}

.issue-url-editor {
  margin-top: 6px;
}

.issue-url-prefix {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
}

.issue-url-control input {
  flex: 1;
  min-width: 0;
  margin-left: 2px;
  padding: 2px 4px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.24);
  border-radius: 3px;
  color: rgb(var(--v-theme-on-surface));
  background: transparent;
  font: inherit;
}

.issue-url-control input:focus {
  border-color: rgb(var(--v-theme-primary));
  outline: 1px solid rgb(var(--v-theme-primary));
}

.issue-url-regenerate {
  flex: 0 0 auto;
  margin-left: 2px;
}

.issue-url-status,
.issue-url-error {
  min-height: 20px;
  padding-top: 4px;
  font-size: 0.75rem;
}

.issue-url-status {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.issue-url-error {
  color: rgb(var(--v-theme-error));
}
</style>

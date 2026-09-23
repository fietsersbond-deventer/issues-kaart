<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Teksten</h1>
    </div>

    <v-table>
      <thead>
        <tr>
          <th>Sleutel</th>
          <th>Type</th>
          <th>Voorbeeld</th>
          <th>Laatst gewijzigd</th>
          <th>Door</th>
          <th aria-label="Acties" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in texts" :key="entry.key">
          <td>{{ entry.key }}</td>
          <td>{{ textTypeLabel(entry.text_type) }}</td>
          <td>{{ preview(entry.text) }}</td>
          <td>{{ formatDate(entry.updated_at) }}</td>
          <td>{{ entry.updated_by_name ?? "-" }}</td>
          <td>
            <v-btn
              v-tooltip:top="'Tekst bewerken'"
              icon="mdi-pencil"
              variant="text"
              :aria-label="`${entry.key} bewerken`"
              @click="openEditor(entry)"
            />
          </td>
        </tr>
      </tbody>
    </v-table>

    <TextEditorDialog
      v-model="isEditorOpen"
      :entry="selectedEntry"
      @saved="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import type { AdminTextEntry } from "~/types/Text";

useTitle("Teksten");

const { data: texts, refresh } = useAdminTexts();
const selectedEntry = ref<AdminTextEntry | null>(null);
const isEditorOpen = ref(false);

function openEditor(entry: AdminTextEntry) {
  selectedEntry.value = entry;
  isEditorOpen.value = true;
}

function preview(text: string) {
  const normalized = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 100
    ? `${normalized.slice(0, 100)}...`
    : normalized;
}

function textTypeLabel(type: AdminTextEntry["text_type"]) {
  if (type === "rich") {
    return "Rijke tekst";
  }
  if (type === "url") {
    return "URL";
  }
  return "Platte tekst";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
</script>

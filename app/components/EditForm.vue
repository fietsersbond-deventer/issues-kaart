<template>
  <v-form
    v-if="issue"
    v-model="valid"
    class="edit-form"
    lazy-validation
    @submit.prevent="onSubmit"
  >
    <v-card class="edit-form-card">
      <v-card-title>
        {{ issue.id ? "Issue bewerken" : "Nieuw Issue" }}
      </v-card-title>

      <v-divider />

      <v-card-text style="height: 100%">
        <v-container fluid class="pa-0">
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model.trim="issue.title"
                label="Titel"
                :rules="[(v:string) => !!v || 'Titel is verplicht']"
                required
              />
            </v-col>

            <v-col cols="12">
              <div class="mb-4">
                <label class="text-subtitle-1 mb-1 d-block">Beschrijving</label>
                <div class="quill-editor-container">
                  <QuillEditor
                    v-model:content="issue.description"
                    content-type="html"
                    :toolbar
                    :modules="modules"
                    class="quill-editor"
                  />
                </div>
                <div
                  v-if="!issue.description"
                  class="text-error text-caption mt-1"
                >
                  Beschrijving is verplicht
                </div>
              </div>
            </v-col>

            <v-col cols="12">
              <v-select
                v-model="issue.legend_id"
                :items="legends"
                item-title="name"
                item-value="id"
                label="Issue Type"
                required
              >
                <template #selection="{ item }">
                  <div class="d-flex align-center">
                    <div
                      class="me-2"
                      style="width: 20px; height: 20px; border-radius: 4px"
                      :style="{ backgroundColor: item.raw.color }"
                    />
                    {{ item.title }}
                  </div>
                </template>
                <template #item="{ item, props }">
                  <v-list-item
                    v-bind="props"
                    :title="item.raw.name"
                    :subtitle="item.raw.description"
                  >
                    <template #prepend>
                      <div
                        style="width: 20px; height: 20px; border-radius: 4px"
                        :style="{ backgroundColor: item.raw.color }"
                      />
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn type="submit" color="primary" variant="flat">Opslaan</v-btn>
        <v-btn color="secondary" variant="flat" @click="showDialog = false"
          >Annuleren</v-btn
        >
        <v-btn v-if="issue.id" color="error" variant="flat" @click="onDelete">
          Verwijderen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-form>
</template>

<script setup lang="ts">
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import type { Issue } from "~/types/Issue";
import { imageCompressor } from "quill-image-compress";
import type { Legend } from "~~/server/database/schema";
import BlotFormatter from "quill-blot-formatter";

const valid = ref(true);
const showDialog = defineModel<boolean>("dialog", { required: false });
const issue = defineModel<Issue>({ required: true });

const modules = [
  {
    name: "blotFormatter",
    module: BlotFormatter,
    options: {
      /* options */
    },
  },
  {
    name: "compress",
    module: imageCompressor,
    options: {
      quality: 0.7,
      maxWidth: 1000,
      maxHeight: 1000,
      imageType: "image/jpeg",
      debug: true,
      suppressErrorLogging: false,
      handleOnPaste: true,
      insertIntoEditor: undefined,
    },
  },
];

const toolbar = [
  [{ header: [1, 2, 3, 4, false] }],
  ["bold", "italic"], // toggled buttons
  ["link", "image"],

  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
];

const { update, create, remove } = useIssueApi();
const { getAll: getLegends } = useLegendApi();
const legends = ref<Legend[]>([]);

onMounted(async () => {
  legends.value = await getLegends();
});

const reactiveFeature = useEditableFeature().inject();

async function onSubmit() {
  if (issue.value && valid.value) {
    if (issue.value.id) {
      await update(issue.value.id, issue.value);
    } else {
      const result = await create(issue.value);
      if (result.id) {
        showDialog.value = false;
        return navigateTo(`/kaart/${result.id}`);
      }
    }
  }
  showDialog.value = false;
}

async function onDelete() {
  if (issue.value?.id) {
    if (
      confirm(`Weet je zeker dat je '${issue.value.title}' wilt verwijderen?`)
    ) {
      await remove(issue.value.id);
      showDialog.value = false;
      return navigateTo("/kaart");
    }
  }
}

watch(
  reactiveFeature.feature,
  (newValue) => {
    if (issue.value && newValue) {
      issue.value.geometry = newValue?.geometry;
    }
  },
  { immediate: true, deep: true }
);
</script>

<style>
.edit-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.edit-form-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.quill-editor-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.quill-editor {
  height: 250px;
}

/* Force Quill editor to fit within container */
:deep(.ql-container) {
  height: calc(100% - 42px) !important; /* 42px is the toolbar height */
}
</style>

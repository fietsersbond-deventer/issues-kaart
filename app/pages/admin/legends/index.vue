<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Categorieën</h1>
        <v-btn color="primary" @click="dialog = true">
          Voeg Categorie toe
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <AdminLegendTable
          :legends="legends || []"
          :usage="legendUsage"
          @edit="editItem"
          @delete="confirmDelete"
        />
      </v-col>
    </v-row>

    <AdminLegendDialog v-model="dialog" :legend="editedLegend" @save="save" />

    <AdminLegendDeleteConfirmDialog
      v-model="dialogDelete"
      :legend="itemToDelete"
      :error="deleteError"
      :usage="legendUsage"
      @confirm="deleteItem"
    />
  </v-container>
</template>

<script setup lang="ts">
import type { Legend as DbLegend } from "~~/server/database/schema";
import type { Legend } from "~/types/Legend";
import type { LegendUsage } from "~/composables/useLegends";

definePageMeta({
  title: "Legenda",
  middleware: ["sidebase-auth"],
});

const legendsStore = useLegends();
const { getUsage, create, update, remove } = legendsStore;
const { legends } = storeToRefs(legendsStore);
const legendUsage = ref<LegendUsage>({});
const dialog = ref(false);
const dialogDelete = ref(false);
const itemToDelete = ref<DbLegend | null>(null);
const deleteError = ref<string>("");
const editedLegend = ref<Legend | undefined>();

onMounted(async () => {
  legendUsage.value = await getUsage();
});

function editItem(item: DbLegend) {
  editedLegend.value = item;
  dialog.value = true;
}

function confirmDelete(item: DbLegend) {
  deleteError.value = "";
  itemToDelete.value = item;
  dialogDelete.value = true;
}

async function deleteItem() {
  if (!itemToDelete.value?.id) return;

  try {
    await remove(itemToDelete.value.id);
    if (legends.value) {
      legends.value = legends.value.filter(
        (item) => item.id !== itemToDelete.value?.id
      );
    }
    dialogDelete.value = false;
    deleteError.value = "";
    itemToDelete.value = null;
  } catch (error: unknown) {
    const e = error as { data?: { message?: string } };
    deleteError.value =
      e.data?.message || "Het verwijderen van het legenda item is mislukt";
  }
}

async function save(
  legendItem: Pick<Legend, "name" | "description" | "color"> & {
    icon?: string;
    icon_data_url?: string;
  }
) {
  try {
    if (editedLegend.value) {
      // Updating
      await update(editedLegend.value.id, legendItem);
    } else {
      // Creating
      const newItem = await create(legendItem);
      if (legends.value) {
        legends.value.push(newItem);
      }
    }
    dialog.value = false;
    editedLegend.value = undefined;
  } catch (error) {
    console.error("Failed to save legend item:", error);
  }
}
</script>

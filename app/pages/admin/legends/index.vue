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
          :legends="legends"
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
import type { Legend } from "~~/server/database/schema";
import type { LegendUsage } from "~/composables/useLegendApi";

definePageMeta({
  title: "Legenda",
  // middleware: ["admin"],
});

const { getAll, getUsage, create, update, remove } = useLegendApi();

const legends = ref<Legend[]>([]);
const legendUsage = ref<LegendUsage>({});
const dialog = ref(false);
const dialogDelete = ref(false);
const itemToDelete = ref<Legend | null>(null);
const deleteError = ref<string>("");
const editedLegend = ref<Legend | undefined>();

onMounted(async () => {
  const [legendsList, usage] = await Promise.all([getAll(), getUsage()]);
  legends.value = legendsList;
  legendUsage.value = usage;
});

function editItem(item: Legend) {
  editedLegend.value = item;
  dialog.value = true;
}

function confirmDelete(item: Legend) {
  deleteError.value = "";
  itemToDelete.value = item;
  dialogDelete.value = true;
}

async function deleteItem() {
  if (!itemToDelete.value?.id) return;

  try {
    await remove(itemToDelete.value.id);
    legends.value = legends.value.filter(
      (item) => item.id !== itemToDelete.value?.id
    );
    dialogDelete.value = false;
    deleteError.value = "";
    itemToDelete.value = null;
  } catch (error: unknown) {
    const e = error as { data?: { message?: string } };
    deleteError.value =
      e.data?.message || "Het verwijderen van het legenda item is mislukt";
  }
}

async function save(legendItem: Partial<Legend>) {
  try {
    if (editedLegend.value) {
      // Updating
      const updatedItem = await update(editedLegend.value.id, legendItem);
      if (updatedItem) {
        const index = legends.value.findIndex((l) => l.id === updatedItem.id);
        if (index !== -1) {
          legends.value[index] = updatedItem;
        }
      }
    } else {
      // Creating
      const newItem = await create(legendItem);
      legends.value.push(newItem);
    }
    dialog.value = false;
    editedLegend.value = undefined;
  } catch (error) {
    console.error("Failed to save legend item:", error);
  }
}
</script>

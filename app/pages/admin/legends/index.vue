<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Legenda</h1>
        <v-btn color="primary" @click="dialog = true">
          Voeg Legenda Item toe
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-table>
          <thead>
            <tr>
              <th>Kleur</th>
              <th>Naam</th>
              <th>Omschrijving</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in legends" :key="item.id">
              <td>
                <div
                  class="color-preview"
                  :style="{ backgroundColor: item.color }"
                />
              </td>
              <td>{{ item.name }}</td>
              <td>{{ item.description }}</td>
              <td>
                <v-btn icon variant="text" size="small" @click="editItem(item)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(item)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span>{{ formTitle }}</span>
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="editedItem.name" label="Naam" required />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="editedItem.description"
                  label="Omschrijving"
                />
              </v-col>
              <v-col cols="12">
                <v-color-picker
                  v-model="editedItem.color"
                  show-swatches
                  swatches-max-height="300px"
                />
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="save"> Opslaan </v-btn>
          <v-btn color="error" variant="text" @click="close"> Annuleren </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="dialogDelete" max-width="500px">
      <v-card>
        <v-card-title>Weet je zeker dat je dit wilt verwijderen?</v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="deleteItem">Ja</v-btn>
          <v-btn color="error" variant="text" @click="closeDelete">Nee</v-btn>
          <v-spacer />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import type { Legend } from "~~/server/database/schema";

const { getAll, create, update, remove } = useLegendApi();

const legends = ref<Legend[]>([]);
const dialog = ref(false);
const dialogDelete = ref(false);

const defaultItem: Partial<Legend> = {
  name: "",
  description: "",
  color: "#2196F3",
};

const editedIndex = ref(-1);
const editedItem = ref<Partial<Legend>>({ ...defaultItem });
const itemToDelete = ref<Legend | null>(null);

const formTitle = computed(() => {
  return editedIndex.value === -1
    ? "Nieuw Legena Item"
    : "Legend Item aanpassen";
});

onMounted(async () => {
  legends.value = await getAll();
});

function editItem(item: Legend) {
  editedIndex.value = legends.value.indexOf(item);
  editedItem.value = { ...item };
  dialog.value = true;
}

function confirmDelete(item: Legend) {
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
  } catch (error) {
    // Handle error (show notification, etc.)
    console.error("Failed to delete legend item:", error);
  }
  closeDelete();
}

function close() {
  dialog.value = false;
  nextTick(() => {
    editedItem.value = { ...defaultItem };
    editedIndex.value = -1;
  });
}

function closeDelete() {
  dialogDelete.value = false;
  itemToDelete.value = null;
}

async function save() {
  try {
    if (editedIndex.value > -1) {
      // Updating
      const updatedItem = await update(
        legends.value[editedIndex.value].id,
        editedItem.value
      );
      Object.assign(legends.value[editedIndex.value], updatedItem);
    } else {
      // Creating
      const newItem = await create(editedItem.value);
      legends.value.push(newItem);
    }
    close();
  } catch (error) {
    // Handle error (show notification, etc.)
    console.error("Failed to save legend item:", error);
  }
}
</script>

<style scoped>
.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>

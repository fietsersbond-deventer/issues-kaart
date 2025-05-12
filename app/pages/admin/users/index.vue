<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <span>Gebruikers</span>
        <v-spacer />
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showDialog">
          Nieuwe gebruiker
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th>Gebruikersnaam</th>
              <th>Aangemaakt op</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.username }}</td>
              <td>{{ new Date(user.created_at).toLocaleDateString() }}</td>
              <td>
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  color="error"
                  size="small"
                  @click="confirmDelete(user)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- New User Dialog -->
    <v-dialog v-model="showNewUserDialog" max-width="500px">
      <v-card>
        <v-card-title>Nieuwe gebruiker</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createUser">
            <v-text-field
              v-model="newUser.username"
              label="Gebruikersnaam"
              required
            />
            <v-text-field
              v-model="newUser.password"
              label="Wachtwoord"
              type="password"
              required
            />
            <v-card-actions>
              <v-spacer />
              <v-btn :loading="loading" color="primary" type="submit">
                Opslaan
              </v-btn>
              <v-btn color="error" @click="showNewUserDialog = false"
                >Annuleren</v-btn
              >
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400px">
      <v-card>
        <v-card-title>Gebruiker verwijderen</v-card-title>
        <v-card-text>
          Weet je zeker dat je de gebruiker "{{ deleteUser?.username }}" wilt
          verwijderen?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :loading="loading" color="error" @click="deleteUserConfirmed">
            Verwijderen
          </v-btn>
          <v-btn @click="showDeleteDialog = false">Annuleren</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "admin",
});

const { users, create, remove } = useUsersApi();

const showNewUserDialog = ref(false);
const showDeleteDialog = ref(false);
const loading = ref(false);
const deleteUser = ref<{ id: number; username: string } | null>(null);
const newUser = ref({
  username: "",
  password: "",
});

function showDialog() {
  showNewUserDialog.value = true;
  newUser.value = { username: "", password: "" };
}

// Create new user
async function createUser() {
  if (!newUser.value.username || !newUser.value.password) return;

  loading.value = true;
  try {
    await create({
      username: newUser.value.username,
      password: newUser.value.password,
    });
    showNewUserDialog.value = false;
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    loading.value = false;
  }
}

// Delete user
function confirmDelete(user: { id: number; username: string }) {
  deleteUser.value = user;
  showDeleteDialog.value = true;
}

async function deleteUserConfirmed() {
  if (!deleteUser.value) return;

  loading.value = true;
  try {
    await remove(deleteUser.value.id);
    showDeleteDialog.value = false;
    deleteUser.value = null;
  } catch (error) {
    console.error("Error deleting user:", error);
  } finally {
    loading.value = false;
  }
}
</script>

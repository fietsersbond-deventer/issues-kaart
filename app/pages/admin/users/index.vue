<template>
  <div>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <span>Gebruikers</span>
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="showNewUserDialog = true"
        >
          Nieuwe gebruiker
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th>Gebruikersnaam</th>
              <th>Naam</th>
              <th>Rol</th>
              <th v-if="hasActiveResetTokens">Wachtwoord reset link</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.username }}</td>
              <td>{{ user.name || "-" }}</td>
              <td>{{ user.role }}</td>
              <td v-if="hasActiveResetTokens">
                <template
                  v-if="user.reset_token && user.reset_token_expires_at"
                >
                  <div>
                    <div class="d-flex align-center">
                      <span
                        class="text-caption text-truncate"
                        style="max-width: 200px"
                        :title="getResetLink(user)"
                      >
                        {{ getResetLink(user) }}
                      </span>
                      <v-btn
                        :icon="true"
                        variant="text"
                        color="primary"
                        size="small"
                        class="ml-2"
                        @click="copyResetLink(user)"
                      >
                        <v-icon>mdi-content-copy</v-icon>
                        <v-tooltip activator="parent" location="top">
                          Kopieer reset link
                        </v-tooltip>
                      </v-btn>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      Verloopt:
                      {{ formatExpiryDate(user.reset_token_expires_at) }}
                    </div>
                  </div>
                </template>
              </td>
              <td>
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  color="primary"
                  size="small"
                  class="mr-2"
                  @click="editUser(user)"
                />
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

    <!-- Edit User Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500px">
      <v-card>
        <v-card-title>Gebruiker bewerken</v-card-title>
        <v-card-text>
          <UserForm
            v-if="editedUser"
            :user="editedUser"
            :loading="loading"
            @submit="updateUser"
            @cancel="showEditDialog = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- New User Dialog -->
    <v-dialog v-model="showNewUserDialog" max-width="500px">
      <v-card>
        <v-card-title>Nieuwe gebruiker</v-card-title>
        <v-card-text>
          <UserForm
            :loading="loading"
            @submit="createUser"
            @cancel="showNewUserDialog = false"
          />
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
import type { User } from "~/types/User";

definePageMeta({
  title: "Gebruikers",
  middleware: [
    "sidebase-auth",
    function (to) {
      const { isAdmin } = useRoles();
      return isAdmin.value ? to : "/admin";
    },
  ],
});

const { users, create, update, remove } = useUsersApi();
const showNewUserDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const loading = ref(false);
const deleteUser = ref<{ id: number; username: string } | null>(null);
const editedUser = ref<Pick<User, "id" | "username" | "name" | "role"> | null>(
  null
);

const hasActiveResetTokens = computed(() => {
  return (
    users.value?.some(
      (user) => user.reset_token && user.reset_token_expires_at
    ) ?? false
  );
});

const runtimeConfig = useRuntimeConfig();
const appUrl = runtimeConfig.public.appUrl || window.location.origin;
const { showSuccess, showError } = useSnackbar();

function getResetLink(user: User): string {
  if (!user.reset_token) return "";
  return `${appUrl}/reset-password/${user.reset_token}`;
}

function formatExpiryDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("nl-NL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

async function copyResetLink(user: User) {
  const link = getResetLink(user);
  if (!link) return;

  try {
    await navigator.clipboard.writeText(link);
    showSuccess("Reset link is gekopieerd naar het klembord");
  } catch (err) {
    console.error("Failed to copy link:", err);
    showError("Kon de reset link niet kopiëren");
  }
}

function editUser(user: User) {
  editedUser.value = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
  showEditDialog.value = true;
}

async function createUser(data: {
  username: string;
  name: string | null;
  role: string;
  password?: string;
}) {
  if (!data.password) {
    console.error("Password is required for new users");
    return;
  }

  loading.value = true;
  try {
    await create({
      username: data.username,
      password: data.password,
      name: data.name,
      role: data.role,
    });
    showNewUserDialog.value = false;
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    loading.value = false;
  }
}

async function updateUser(data: {
  username: string;
  name: string | null;
  role: string;
}) {
  if (!editedUser.value) return;

  loading.value = true;
  try {
    await update(editedUser.value.id, data);
    showEditDialog.value = false;
    editedUser.value = null;
  } catch (error) {
    console.error("Error updating user:", error);
  } finally {
    loading.value = false;
  }
}

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

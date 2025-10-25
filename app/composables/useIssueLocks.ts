import { ref, watch, computed } from "vue";
import { defineStore } from "pinia";
import { useSharedAuthWebSocket } from "./useSharedAuthWebSocket";

export const useIssueLocks = defineStore("issueLocks", () => {
  const { isEditing } = useIsEditing();
  const { selectedId } = storeToRefs(useSelectedIssue());

  // Extract the user's name and authentication status
  const { data: authData, status } = useAuth();
  const isAuthenticated = computed(() => status.value === "authenticated");

  // Use shared WebSocket connection
  const authWs = useSharedAuthWebSocket();

  // Watch authentication status and manage WebSocket connection
  watch(
    isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        // Don't manage connection here - let useOnlineUsers handle it
        // Re-establish lock if user was editing when connection was lost
        if (
          isEditing.value &&
          selectedId.value &&
          authWs.status.value === "OPEN"
        ) {
          console.log("Lock herstellen voor issue:", selectedId.value);
          notifyEditing(selectedId.value, true);
        }
      }
      // Don't close connection here - let useOnlineUsers handle it
    },
    { immediate: true }
  );

  const userName = computed(() => authData.value?.name || "Onbekend");

  const editingUsers = ref<Record<string, { peer: string; username: string }>>(
    {}
  );

  // Clear editing users when connection is lost (prevent stale lock indicators)
  watch(
    () => authWs.status.value,
    (status) => {
      if (status === "CLOSED" || status === "CONNECTING") {
        editingUsers.value = {};
        console.log("Lock status gewist vanwege verbindingsverlies");
      }
    }
  );

  watch(
    selectedId,
    (_newId, oldId) => {
      if (oldId && isEditing.value) notifyEditing(oldId, false);
    },
    { immediate: true }
  );

  watch(
    isEditing,
    (newIsEditing, oldIsEditing) => {
      if (oldIsEditing !== newIsEditing) {
        notifyEditing(selectedId.value!, newIsEditing);
      }
    },
    { immediate: true }
  );

  // Subscribe to WebSocket messages for lock status updates
  const unsubscribe = authWs.subscribe((message) => {
    if (message.type === "editing-status") {
      editingUsers.value =
        (message.payload as Record<
          string,
          { peer: string; username: string }
        >) || {};
    }
  });

  function notifyEditing(issueId: number, isEditing: boolean) {
    // Only send if authenticated and WebSocket is connected
    if (!isAuthenticated.value || authWs.status.value !== "OPEN") {
      return;
    }

    if (isEditing) {
      authWs.send(
        JSON.stringify({
          type: "lockIssue",
          issueId,
          username: userName.value,
        })
      );
    } else {
      authWs.send(
        JSON.stringify({
          type: "unlockIssue",
          issueId,
          username: userName.value,
        })
      );
    }
  }

  function isLocked(issueId: number) {
    const editingUser = editingUsers.value[issueId];
    if (editingUser !== undefined && editingUser.username !== userName.value) {
      return editingUser.username;
    }
    return false;
  }

  const locks = computed(() => {
    const locks: Record<string, string> = {};
    for (const id in editingUsers.value) {
      const user = editingUsers.value[id];
      if (user && user.username !== userName.value) {
        locks[id] = user.username;
      }
    }
    return locks;
  });

  const isLockedByOther = computed(() => {
    if (!selectedId.value) return false;
    return isLocked(selectedId.value);
  });

  // Cleanup function
  function cleanup() {
    unsubscribe();
  }

  return {
    editingUsers,
    notifyEditing,
    isLockedByOther,
    isLocked,
    locks,
    cleanup,
  };
});

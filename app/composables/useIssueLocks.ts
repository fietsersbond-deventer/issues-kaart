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

  // Import snackbar for connection warnings
  const { showPersistent, hide, showMessage } = useSnackbar();

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

  const userName = computed(() => authData.value?.username || "unknown");
  const displayName = computed(
    () => authData.value?.name || authData.value?.username || "Unknown"
  );

  const editingUsers = ref<
    Record<string, { peer: string; username: string; displayName: string }>
  >({});

  // Track our own peer ID
  const myPeerId = ref<string | null>(null);

  // Track connection status for warnings
  const isConnected = computed(() => authWs.status.value === "OPEN");
  const connectionWarningShown = ref(false);

  // Clear editing users when connection is lost (prevent stale lock indicators)
  watch(
    () => authWs.status.value,
    (status, prevStatus) => {
      if (status === "CLOSED" || status === "CONNECTING") {
        editingUsers.value = {};
        myPeerId.value = null; // Clear our peer ID too
        console.debug("Lock status gewist vanwege verbindingsverlies");

        // Show warning about unsafe editing when connection is lost
        if (isAuthenticated.value && !connectionWarningShown.value) {
          showPersistent("Verbinding verbroken");
          connectionWarningShown.value = true;
        }
      } else if (status === "OPEN" && prevStatus !== "OPEN") {
        // WebSocket reconnected - send current editing state
        console.debug("WebSocket reconnected, sending current editing state");

        // Clear connection warning when reconnected
        if (connectionWarningShown.value) {
          hide(); // Hide the persistent warning
          showMessage("Verbinding hersteld");
          connectionWarningShown.value = false;
        }

        if (selectedId.value && isAuthenticated.value) {
          // We know which issue we're on, send specific lock state
          notifyEditing(selectedId.value, isEditing.value);
        } else if (isAuthenticated.value) {
          // No selected issue, but we might have had locks - clear any stale locks
          console.debug(
            "No selected issue on reconnect, clearing any stale locks"
          );
          authWs.sendMessage("clearMyLocks", {
            username: userName.value,
            displayName: displayName.value,
          });
        }
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
          { peer: string; username: string; displayName: string }
        >) || {};
    } else if (message.type === "peer-connected") {
      myPeerId.value = message.payload as string;
    }
  });

  function notifyEditing(issueId: number, isEditing: boolean) {
    // Only send if authenticated and WebSocket is connected
    if (!isAuthenticated.value || authWs.status.value !== "OPEN") {
      return;
    }

    if (isEditing) {
      authWs.sendMessage("lockIssue", {
        issueId,
        username: userName.value,
        displayName: displayName.value,
      });
    } else {
      authWs.sendMessage("unlockIssue", {
        issueId,
        username: userName.value,
        displayName: displayName.value,
      });
    }
  }

  function isLocked(issueId: number) {
    const editingUser = editingUsers.value[issueId];
    // Show as locked if someone else is editing (different peer ID)
    if (editingUser !== undefined && editingUser.peer !== myPeerId.value) {
      return editingUser.displayName || editingUser.username;
    }
    return false;
  }

  const locks = computed(() => {
    const locks: Record<string, string> = {};
    for (const id in editingUsers.value) {
      const user = editingUsers.value[id];
      // Show lock if someone else is editing (different peer ID)
      if (user && user.peer !== myPeerId.value) {
        locks[id] = user.displayName || user.username;
      }
    }
    return locks;
  });

  const isLockedByOther = computed(() => {
    if (!selectedId.value) return false;
    return isLocked(selectedId.value);
  });

  // Warn about unsafe editing when connection is lost
  const isEditingUnsafe = computed(
    () => isAuthenticated.value && !isConnected.value
  );

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
    isConnected,
    isEditingUnsafe,
    cleanup,
  };
});

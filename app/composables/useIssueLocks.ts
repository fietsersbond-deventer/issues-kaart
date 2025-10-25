import { ref, watch, computed } from "vue";
import { useWebSocket } from "@vueuse/core";
import { defineStore } from "pinia";

export const useIssueLocks = defineStore("issueLocks", () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const websocketUrl = `${protocol}://${window.location.host}/ts/lock`;

  const { isEditing } = useIsEditing();
  const { selectedId } = storeToRefs(useSelectedIssue());

  // Extract the user's name and authentication status
  const { data: authData, status } = useAuth();
  const isAuthenticated = computed(() => status.value === "authenticated");

  // Create WebSocket instance at top level - but control its connection state
  const ws = useWebSocket(websocketUrl, {
    immediate: false, // Don't connect immediately
    autoReconnect: {
      retries: 5,
      delay: 1000,
      onFailed() {
        console.error(
          "WebSocket verbinding herstellen mislukt na meerdere pogingen"
        );
      },
    },
    onConnected() {
      console.log("WebSocket verbonden met", websocketUrl);
      // Re-establish lock if user was editing when connection was lost
      if (isAuthenticated.value && isEditing.value && selectedId.value) {
        console.log("Lock herstellen voor issue:", selectedId.value);
        notifyEditing(selectedId.value, true);
      }
    },
    onDisconnected() {
      console.log("WebSocket verbinding verbroken");
    },
    onError(error) {
      console.error("WebSocket fout:", error);
    },
  });

  // Watch authentication status and manage WebSocket connection
  watch(
    isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        ws.open();
      } else {
        ws.close();
      }
    },
    { immediate: true }
  );

  const userName = computed(() => authData.value?.name || "Onbekend");

  const editingUsers = ref<Record<string, { peer: string; username: string }>>(
    {}
  );

  // Clear editing users when connection is lost (prevent stale lock indicators)
  watch(
    () => ws.status.value,
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

  watch(ws.data, (data) => {
    if (!data) return;
    console.debug("WebSocket message received:", data);
    try {
      const message = JSON.parse(data as string);
      if (message.type === "editing-status") {
        editingUsers.value = message.payload;
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  });

  function notifyEditing(issueId: number, isEditing: boolean) {
    console.debug("notifyEditing", { issueId, isEditing });

    // Only send if authenticated and WebSocket is connected
    if (!isAuthenticated.value || ws.status.value !== "OPEN") {
      console.warn(
        "Kan bewerking niet melden: niet geauthenticeerd of WebSocket niet verbonden"
      );
      return;
    }

    if (isEditing) {
      ws.send(
        JSON.stringify({
          type: "lockIssue",
          issueId,
          username: userName.value,
        })
      );
    } else {
      ws.send(
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

  return {
    editingUsers,
    notifyEditing,
    isLockedByOther,
    isLocked,
    locks,
  };
});

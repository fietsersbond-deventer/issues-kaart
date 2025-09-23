import { ref, watch } from "vue";
import { useWebSocket } from "@vueuse/core";
import { defineStore } from "pinia";

export const useIssueLocks = defineStore("issueLocks", () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const websocketUrl = `${protocol}://${window.location.host}/ts/lock`;

  const { isEditing } = useIsEditing();
  const { selectedId } = storeToRefs(useSelectedIssue());

  // Extract the user's name from the authentication context
  const { data: authData } = useAuth();

  const { data: wsData, send: wsSend } = useWebSocket(websocketUrl, {
    autoReconnect: true,
    onConnected() {
      console.log("WebSocket connected to", websocketUrl);
    },
    onDisconnected() {
      console.log("WebSocket disconnected");
    },
    onError(error) {
      console.error("WebSocket error:", error);
    },
  });

  const userName = computed(() => authData.value?.name || "Onbekend");

  const editingUsers = ref<Record<string, { peer: string; username: string }>>(
    {}
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

  watch(wsData, (data) => {
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
    if (isEditing) {
      wsSend(
        JSON.stringify({
          type: "lockIssue",
          issueId,
          username: userName.value,
        })
      );
    } else {
      wsSend(
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

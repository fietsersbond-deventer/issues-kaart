import { ref, watch } from "vue";
import { useWebSocket } from "@vueuse/core";
import { defineStore } from "pinia";

export const useIssueLocks = defineStore("issueLocks", () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const websocketUrl = `${protocol}://${window.location.host}/ts/lock`;

  const { isEditing } = useIsEditing();
  const { selectedId } = storeToRefs(useSelectedIssue());

  // Extract the user's name from the authentication context
  const { data } = useAuth();
  const username = data.value?.name || "Onbekend";

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

  const editingUsers = ref<Record<number, string>>({});

  watch(
    [selectedId, isEditing],
    ([newSelectedId, newIsEditing], [oldSelectedId, oldIsEditing]) => {
      console.log(
        "Selected ID changed from",
        oldSelectedId,
        "to",
        newSelectedId
      );
      console.log("Is editing changed from", oldIsEditing, "to", newIsEditing);
      if (oldSelectedId && oldSelectedId !== newSelectedId && oldIsEditing) {
        notifyEditing(+oldSelectedId, false);
      }
      if (newSelectedId) {
        notifyEditing(+newSelectedId, newIsEditing);
      }
    },
    { immediate: true }
  );

  watch(wsData, (data) => {
    console.log("WebSocket message received:", data);
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
    if (isEditing) {
      wsSend(
        JSON.stringify({
          type: "lockIssue",
          issueId,
          username,
        })
      );
    } else {
      wsSend(
        JSON.stringify({
          type: "unlockIssue",
          issueId,
          username,
        })
      );
    }
  }

  function isLocked(issueId: number): boolean {
    console.log("Current editing users:", editingUsers.value);
    return editingUsers.value[issueId] !== undefined;
  }

  return {
    editingUsers,
    notifyEditing,
    isLocked,
  };
});

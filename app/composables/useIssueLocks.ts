import { ref, watch } from "vue";
import { useWebSocket } from "@vueuse/core";

export function useIssueLocks() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const websocketUrl = `${protocol}://${window.location.host}/ts/lock`;

  // Extract the user's name from the authentication context
  const { data: authData } = useAuth();
  const username = (authData as any)?.name || "Onbekend"; // Temporarily cast to any to bypass type error

  const { data: wsData, send: wsSend } = useWebSocket(websocketUrl, {
    autoReconnect: true,
    onConnected() {
      console.log("WebSocket connected to", websocketUrl);
    },
    onDisconnected() {
      console.log("WebSocket disconnected.");
    },
    onError(error) {
      console.error("WebSocket error:", error);
    },
  });

  const editingUsers = ref<Record<number, string>>({});

  watch(wsData, (data) => {
    if (data?.type === "editing-status") {
      editingUsers.value = data.payload;
    }
  });

  function notifyEditing(issueId: number, isEditing: boolean) {
    wsSend(
      JSON.stringify({
        type: "editing-status",
        issueId,
        isEditing,
        username,
      })
    ); // Send the entire object as a string
  }

  return {
    editingUsers,
    notifyEditing,
  };
}

import { ref, computed, watch, nextTick } from "vue";
import { defineStore } from "pinia";
import { useSharedAuthWebSocket } from "./useSharedAuthWebSocket";

export interface OnlineUser {
  username: string;
  name: string | null;
  userId: number;
  connectedAt: number;
}

export const useOnlineUsers = defineStore("onlineUsers", () => {
  // Extract the user's authentication data
  const { data: authData, status } = useAuth();
  const isAuthenticated = computed(() => status.value === "authenticated");

  // Use shared WebSocket connection
  const authWs = useSharedAuthWebSocket();

  // Store online users
  const onlineUsers = ref<OnlineUser[]>([]);
  const connectionStatus = computed(() => authWs.status.value);

  // Clear online users when disconnected (they'll be repopulated on reconnect)
  watch(connectionStatus, (status) => {
    if (status === "CLOSED" || status === "CONNECTING") {
      onlineUsers.value = [];
    }
  });

  // Notify server that user is online
  function notifyUserOnline() {
    if (
      !isAuthenticated.value ||
      !authData.value ||
      authWs.status.value !== "OPEN"
    ) {
      return;
    }

    authWs.send(
      JSON.stringify({
        type: "user-online",
        username: authData.value.username,
        name: authData.value.name,
        userId: authData.value.id,
      })
    );
  }

  // Notify server that user is offline
  function notifyUserOffline() {
    if (authWs.status.value === "OPEN") {
      authWs.send(JSON.stringify({ type: "user-offline" }));
    }
  }

  // Watch authentication status and manage WebSocket connection
  watch(
    isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        authWs.open();
        // Send user online notification when authenticated
        nextTick(() => {
          if (authWs.status.value === "OPEN") {
            notifyUserOnline();
          }
        });
      } else {
        notifyUserOffline();
        authWs.close();
        onlineUsers.value = []; // Clear online users when not authenticated
      }
    },
    { immediate: true }
  );

  // Subscribe to WebSocket messages
  const unsubscribe = authWs.subscribe((message) => {
    if (message.type === "online-users") {
      onlineUsers.value = (message.payload as OnlineUser[]) || [];
    }
  });

  // Watch for connection events to re-register user
  watch(
    () => authWs.status.value,
    (status, prevStatus) => {
      if (status === "OPEN" && prevStatus !== "OPEN" && isAuthenticated.value) {
        console.log("Auth WebSocket reconnected, re-registering user");
        notifyUserOnline();
      }
    }
  );

  // Computed properties for easier use
  const currentUser = computed(() => authData.value);

  const otherOnlineUsers = computed(() => {
    if (!currentUser.value) return onlineUsers.value;

    return onlineUsers.value.filter(
      (user) => user.userId !== Number(currentUser.value!.id)
    );
  });

  const onlineUserCount = computed(() => onlineUsers.value.length);
  const otherUserCount = computed(() => otherOnlineUsers.value.length);

  // Get user display name
  function getUserDisplayName(user: OnlineUser): string {
    return user.name || user.username;
  }

  // Get user initials for avatar
  function getUserInitials(user: OnlineUser): string {
    const displayName = getUserDisplayName(user);
    const words = displayName
      .split(" ")
      .filter((word) => word.trim().length > 0);

    if (words.length >= 2) {
      const first = words[0]?.charAt(0) || "";
      const second = words[1]?.charAt(0) || "";
      return (first + second).toUpperCase();
    } else if (words.length >= 1) {
      const word = words[0] || "";
      return word.substring(0, 2).toUpperCase();
    } else {
      return "U"; // fallback
    }
  }

  // Generate a consistent color that matches navbar buttons
  function getUserAvatarColor(_user: OnlineUser): string {
    // Use a neutral dark color that matches the navbar button icons
    return "#424242"; // Material Design grey-800, matches button text color
  }

  // Cleanup on unmount
  function cleanup() {
    notifyUserOffline();
    unsubscribe();
  }

  // Clean up when navigating away
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", cleanup);
  }

  return {
    onlineUsers,
    otherOnlineUsers,
    onlineUserCount,
    otherUserCount,
    currentUser,
    connectionStatus,
    getUserDisplayName,
    getUserInitials,
    getUserAvatarColor,
    notifyUserOnline,
    notifyUserOffline,
    cleanup,
  };
});

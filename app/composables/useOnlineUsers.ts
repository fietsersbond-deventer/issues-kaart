import { ref, computed, watch } from "vue";
import { useWebSocket } from "@vueuse/core";
import { defineStore } from "pinia";

export interface OnlineUser {
  username: string;
  name: string | null;
  userId: number;
  connectedAt: number;
}

export const useOnlineUsers = defineStore("onlineUsers", () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const websocketUrl = `${protocol}://${window.location.host}/ts/presence`;

  // Extract the user's authentication data
  const { data: authData, status } = useAuth();
  const isAuthenticated = computed(() => status.value === "authenticated");

  // Create WebSocket instance at top level - but control its connection state
  const ws = useWebSocket(websocketUrl, {
    immediate: false, // Don't connect immediately
    autoReconnect: {
      retries: 5,
      delay: 1000,
      onFailed() {
        console.error("WebSocket verbinding herstellen mislukt na meerdere pogingen");
      },
    },
    onConnected() {
      console.log("WebSocket verbonden met", websocketUrl);
      // Send user online notification when connected (including reconnects)
      if (isAuthenticated.value && authData.value) {
        console.log("Gebruiker registreren als online:", authData.value.username);
        notifyUserOnline();
      }
    },
    onDisconnected() {
      console.log("WebSocket verbinding verbroken");
    },
    onError(error) {
      console.error("WebSocket fout:", error);
    },
  });

  // Store online users
  const onlineUsers = ref<OnlineUser[]>([]);
  const connectionStatus = computed(() => ws.status.value);
  
  // Clear online users when disconnected (they'll be repopulated on reconnect)
  watch(connectionStatus, (status) => {
    if (status === "CLOSED" || status === "CONNECTING") {
      onlineUsers.value = [];
    }
  });

  // Notify server that user is online
  function notifyUserOnline() {
    if (!isAuthenticated.value || !authData.value || ws.status.value !== "OPEN") {
      return;
    }

    ws.send(JSON.stringify({
      type: "user-online",
      username: authData.value.username,
      name: authData.value.name,
      userId: authData.value.id,
    }));
  }

  // Notify server that user is offline
  function notifyUserOffline() {
    if (ws.status.value === "OPEN") {
      ws.send(JSON.stringify({ type: "user-offline" }));
    }
  }

  // Watch authentication status and manage WebSocket connection
  watch(
    isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        ws.open();
      } else {
        notifyUserOffline();
        ws.close();
        onlineUsers.value = []; // Clear online users when not authenticated
      }
    },
    { immediate: true }
  );

  // Watch for incoming WebSocket messages
  watch(ws.data, (data) => {
    if (!data) return;
    
    try {
      const message = JSON.parse(data as string);
      
      if (message.type === "online-users") {
        onlineUsers.value = message.payload || [];
        console.debug("Online gebruikers bijgewerkt:", onlineUsers.value);
      }
    } catch (error) {
      console.error("WebSocket bericht verwerken mislukt:", error);
    }
  });

  // Computed properties for easier use
  const currentUser = computed(() => authData.value);
  
  const otherOnlineUsers = computed(() => {
    if (!currentUser.value) return onlineUsers.value;
    
    return onlineUsers.value.filter(user => 
      user.userId !== Number(currentUser.value!.id)
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
    const words = displayName.split(' ').filter(word => word.trim().length > 0);
    
    if (words.length >= 2) {
      const first = words[0]?.charAt(0) || '';
      const second = words[1]?.charAt(0) || '';
      return (first + second).toUpperCase();
    } else if (words.length >= 1) {
      const word = words[0] || '';
      return word.substring(0, 2).toUpperCase();
    } else {
      return 'U'; // fallback
    }
  }

  // Generate a consistent color that matches navbar buttons
  function getUserAvatarColor(_user: OnlineUser): string {
    // Use a neutral dark color that matches the navbar button icons
    return '#424242'; // Material Design grey-800, matches button text color
  }

  // Cleanup on unmount
  function cleanup() {
    notifyUserOffline();
  }

  // Clean up when navigating away
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
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
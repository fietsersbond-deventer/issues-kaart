import { defineStore } from "pinia";
import { useSharedAuthWebSocket } from "./useSharedAuthWebSocket";
import type { OnlineUser } from "@/types/WebSocketMessages";

export const useOnlineUsers = defineStore("onlineUsers", () => {
  // Extract the user's authentication data
  const { data: authData, status } = useAuth();
  const isAuthenticated = computed(() => status.value === "authenticated");

  // Use shared WebSocket connection
  const authWs = useSharedAuthWebSocket();

  // Import snackbar for notifications
  const { showMessage } = useSnackbar();

  // Store online users
  const onlineUsers = ref<OnlineUser[]>([]);
  const previousOnlineUsers = ref<OnlineUser[]>([]);
  const connectionStatus = computed(() => authWs.status.value);

  // Track our own peer ID
  const myPeerId = ref<string | null>(null);

  // Clear online users when disconnected (they'll be repopulated on reconnect)
  watch(connectionStatus, (status) => {
    if (status === "CLOSED" || status === "CONNECTING") {
      previousOnlineUsers.value = [...onlineUsers.value];
      onlineUsers.value = [];
      myPeerId.value = null;
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

    authWs.sendMessage("user-online", {
      username: authData.value.username,
      name: authData.value.name,
      userId: Number(authData.value.id),
    });
  }

  // Notify server that user is offline
  function notifyUserOffline() {
    if (authWs.status.value === "OPEN") {
      authWs.sendMessage("user-offline", {});
    }
  }

  // Watch authentication status and manage WebSocket connection
  watch(
    isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        authWs.open();
        // Don't try to send immediately - wait for connection status change
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
    } else if (message.type === "peer-connected") {
      myPeerId.value = message.payload as string;
    }
  });

  // Watch for changes in online users to show notifications
  watch(
    onlineUsers,
    (newUsers, oldUsers) => {
      if (!isAuthenticated.value || !currentUser.value) return;

      // Skip notifications on initial load or when reconnecting
      if (oldUsers.length === 0) {
        previousOnlineUsers.value = [...newUsers];
        return;
      }

      const currentUserId = Number(currentUser.value.id);

      // Create sets of user IDs for easy comparison
      const oldUserIds = new Set(oldUsers.map((user) => user.userId));
      const newUserIds = new Set(newUsers.map((user) => user.userId));

      // Find users who joined
      const joinedUsers = newUsers.filter(
        (user) => user.userId !== currentUserId && !oldUserIds.has(user.userId)
      );

      // Find users who left
      const leftUsers = oldUsers.filter(
        (user) => user.userId !== currentUserId && !newUserIds.has(user.userId)
      );

      // Show notifications for joined users
      joinedUsers.forEach((user) => {
        const displayName = getUserDisplayName(user);
        showMessage(`${displayName} is ook ingelogd`, "info");
      });

      // Show notifications for left users
      leftUsers.forEach((user) => {
        const displayName = getUserDisplayName(user);
        showMessage(`${displayName} is uitgelogd`, "info");
      });

      previousOnlineUsers.value = [...newUsers];
    },
    { deep: true }
  );

  // Watch for connection events to re-register user
  watch(
    () => authWs.status.value,
    (status, prevStatus) => {
      if (status === "OPEN" && prevStatus !== "OPEN" && isAuthenticated.value) {
        notifyUserOnline();
      }
    }
  );

  // Computed properties for easier use
  const currentUser = computed(() => authData.value);

  const displayedOnlineUsers = computed(() => {
    if (!currentUser.value || !myPeerId.value) return onlineUsers.value;

    const currentUserId = Number(currentUser.value.id);

    // Count how many peers (sessions) the current user has
    const mySessionCount = onlineUsers.value.filter(
      (user) => user.userId === currentUserId
    ).length;

    // Helper function to deduplicate users by userId (keep most recent)
    const deduplicateUsers = (users: OnlineUser[]): OnlineUser[] => {
      const userMap = new Map<number, OnlineUser>();

      // Find the most recent connection for each userId
      users.forEach((user) => {
        const existing = userMap.get(user.userId);
        if (!existing || user.connectedAt > existing.connectedAt) {
          userMap.set(user.userId, user);
        }
      });

      return Array.from(userMap.values());
    };

    // Get deduplicated other users (excluding current user)
    const otherUsers = onlineUsers.value.filter(
      (user) => user.userId !== currentUserId
    );
    const deduplicatedOtherUsers = deduplicateUsers(otherUsers);

    // If user has multiple sessions, add one instance of self
    // If user has only one session, show only other users
    if (mySessionCount > 1) {
      const selfUser = onlineUsers.value.find(
        (user) => user.peerId === myPeerId.value
      );

      return selfUser
        ? [...deduplicatedOtherUsers, selfUser]
        : deduplicatedOtherUsers;
    } else {
      return deduplicatedOtherUsers;
    }
  });

  const onlineUserCount = computed(() => onlineUsers.value.length);
  const displayedUserCount = computed(() => displayedOnlineUsers.value.length);

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
    displayedOnlineUsers,
    onlineUserCount,
    displayedUserCount,
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

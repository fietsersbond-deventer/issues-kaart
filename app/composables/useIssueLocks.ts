import { ref, watch, computed } from "vue";
import { defineStore } from "pinia";
import { useSharedAuthWebSocket } from "./useSharedAuthWebSocket";
import { useConnectionStatus } from "./useConnectionStatus";

export const useIssueLocks = defineStore("issueLocks", () => {
  const { selectedId } = storeToRefs(useSelectedIssue());

  // Extract authentication status
  const { status } = useAuth();
  const isAuthenticated = computed(() => status.value === "authenticated");

  // Use shared WebSocket connection
  const authWs = useSharedAuthWebSocket();

  // Use connection status composable for warnings and status tracking
  const { isConnected } = useConnectionStatus();

  // Watch authentication status and manage WebSocket connection
  watch(
    isAuthenticated,
    (authenticated, wasAuthenticated) => {
      if (authWs.status.value !== "OPEN") return;
      if (authenticated) syncOwnedLocks();
      else if (wasAuthenticated) authWs.sendMessage("clearMyLocks", {});
      // Don't close connection here - let useOnlineUsers handle it
    },
    { immediate: false },
  );

  const editingUsers = ref<
    Record<
      string,
      { peer: string; username: string; displayName: string; lockedAt: number }
    >
  >({});

  // Use centrally stored peer ID from shared WebSocket
  const myPeerId = authWs.peerId;
  const ownedLocks = ref<Record<string, number>>({});

  function syncOwnedLocks() {
    const issueIds = Object.keys(ownedLocks.value);
    if (issueIds.length === 0) {
      authWs.sendMessage("clearMyLocks", {});
      return;
    }

    issueIds.forEach((issueId) => notifyEditing(Number(issueId), true));
  }

  // Clear editing users when connection is lost (prevent stale lock indicators)
  watch(
    () => authWs.status.value,
    (status, prevStatus) => {
      if (status === "CLOSED" || status === "CONNECTING") {
        editingUsers.value = {};
        console.debug("Lock status gewist vanwege verbindingsverlies");
      } else if (status === "OPEN" && prevStatus !== "OPEN") {
        if (isAuthenticated.value) syncOwnedLocks();
      }
    },
  );

  // Subscribe to WebSocket messages for lock status updates
  const unsubscribe = authWs.subscribe((message) => {
    if (message.type === "editing-status") {
      editingUsers.value = message.payload || {};
    }
    // peer-connected is now handled centrally in useSharedAuthWebSocket
  });

  function notifyEditing(issueId: number, isEditing: boolean) {
    // Only send if authenticated and WebSocket is connected
    if (!isAuthenticated.value || authWs.status.value !== "OPEN") {
      return;
    }

    // Server will derive user info from verified JWT token
    if (isEditing) {
      authWs.sendMessage("lockIssue", {
        issueId,
      });
    } else {
      authWs.sendMessage("unlockIssue", {
        issueId,
      });
    }
  }

  function acquireLock(issueId: number) {
    const key = String(issueId);
    const count = ownedLocks.value[key] ?? 0;
    ownedLocks.value[key] = count + 1;
    if (count === 0) notifyEditing(issueId, true);
  }

  function releaseLock(issueId: number) {
    const key = String(issueId);
    const count = ownedLocks.value[key];
    if (count === undefined) return;

    if (count > 1) {
      ownedLocks.value[key] = count - 1;
      return;
    }

    ownedLocks.value = Object.fromEntries(
      Object.entries(ownedLocks.value).filter(([issueKey]) => issueKey !== key),
    );
    notifyEditing(issueId, false);
  }

  function isLocked(issueId: number) {
    const editingUser = editingUsers.value[issueId];
    // Show as locked if someone else is editing (different peer ID)
    if (editingUser !== undefined && editingUser.peer !== myPeerId.value) {
      return editingUser.displayName || editingUser.username;
    }
    return false;
  }

  function getEditAvailability(issueId: number | null | undefined) {
    if (!isConnected.value) {
      return { status: "disconnected" as const };
    }

    const lockedBy = issueId == null ? false : isLocked(issueId);
    if (lockedBy) {
      return { status: "locked" as const, lockedBy };
    }

    return { status: "available" as const };
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
    () => isAuthenticated.value && !isConnected.value,
  );

  // Cleanup function
  function cleanup() {
    unsubscribe();
  }

  return {
    editingUsers,
    acquireLock,
    releaseLock,
    isLockedByOther,
    isLocked,
    getEditAvailability,
    locks,
    isConnected,
    isEditingUnsafe,
    cleanup,
  };
});

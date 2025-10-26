import { ref, watch, computed, onUnmounted } from "vue";
import { useSharedAuthWebSocket } from "./useSharedAuthWebSocket";

export function useConnectionStatus() {
  const authWs = useSharedAuthWebSocket();
  const { showPersistent, hide, showMessage } = useSnackbar();

  // Track connection status for warnings
  const isConnected = computed(() => authWs.status.value === "OPEN");
  const connectionWarningShown = ref(false);
  const isPageUnloading = ref(false);

  // Track page unload to avoid showing warnings during normal navigation
  let handleBeforeUnload: (() => void) | null = null;
  if (import.meta.client) {
    handleBeforeUnload = () => {
      isPageUnloading.value = true;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
  }

  // Handle connection status changes
  const unwatchConnection = watch(
    () => authWs.status.value,
    (status, prevStatus) => {
      if (status === "CLOSED" || status === "CONNECTING") {
        // Show warning about unsafe editing when connection is lost
        // But only if the page is not being unloaded (normal navigation)
        if (!connectionWarningShown.value && !isPageUnloading.value) {
          showPersistent("Verbinding verbroken");
          connectionWarningShown.value = true;
        }
      } else if (status === "OPEN" && prevStatus !== "OPEN") {
        // Only show "reconnected" message if we had previously shown a disconnection warning
        // This prevents showing the message on initial connection
        if (connectionWarningShown.value) {
          hide(); // Hide the persistent warning
          showMessage("Verbinding hersteld");
          connectionWarningShown.value = false;
        }
      }
    }
  );

  // Cleanup function
  function cleanup() {
    unwatchConnection();

    // Clean up event listeners
    if (import.meta.client && handleBeforeUnload) {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    }
  }

  // Auto cleanup on component unmount
  onUnmounted(cleanup);

  return {
    isConnected,
    connectionWarningShown,
    isPageUnloading,
  };
}

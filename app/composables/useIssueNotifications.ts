import type { Issue } from "@/types/Issue";

/**
 * Handles notifications for issue mutations
 * - Editor gets snackbar with confirmation ("Opgeslagen", "Verwijderd")
 * - Others get alert with full info including who made the change
 */
export function useIssueNotifications() {
  const snackbar = useSharedSnackbar();
  const { status, data: authData } = useAuth();
  const isAuthenticated = computed(() => status.value === "authenticated");
  const ws = useSharedIssuesWebSocket();

  // Subscribe to WebSocket messages and show appropriate notifications
  const unsubscribe = ws.subscribe((parsed) => {
    if (!isAuthenticated.value) return;

    switch (parsed.type) {
      case "issue-created": {
        const payload = parsed.payload as Issue & { createdBy: string; createdByUserId: number };
        const isOwnAction = Number(authData.value?.id) === payload.createdByUserId;
        
        if (isOwnAction) {
          // Short confirmation for editor
          snackbar.showMessage("Onderwerp aangemaakt");
        } else {
          // Full info for others
          snackbar.showPersistent(
            `Onderwerp "${payload.title}" aangemaakt door ${payload.createdBy}`,
            "info"
          );
        }
        break;
      }
      case "issue-modified": {
        const payload = parsed.payload as Issue & { modifiedBy: string; modifiedByUserId: number };
        const isOwnAction = Number(authData.value?.id) === payload.modifiedByUserId;
        
        if (isOwnAction) {
          // Short confirmation for editor
          snackbar.showMessage("Opgeslagen");
        } else {
          // Full info for others
          snackbar.showPersistent(
            `Onderwerp "${payload.title}" gewijzigd door ${payload.modifiedBy}`,
            "info"
          );
        }
        break;
      }
      case "issue-deleted": {
        const payload = parsed.payload as {
          id: number;
          title: string;
          deletedBy: string;
          deletedByUserId: number;
        };
        const isOwnAction = Number(authData.value?.id) === payload.deletedByUserId;
        
        if (isOwnAction) {
          // Short confirmation for editor
          snackbar.showMessage("Verwijderd");
        } else {
          // Full info for others
          snackbar.showPersistent(
            `Onderwerp "${payload.title}" verwijderd door ${payload.deletedBy}`,
            "info"
          );
        }
        break;
      }
    }
  });

  onUnmounted(unsubscribe);

  return {
    // Exposed for cleanup if needed
  };
}

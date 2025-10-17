/**
 * Shared snackbar handler - ensures messages are only shown once
 * even when multiple stores are active
 */
export const useSharedSnackbar = (() => {
  let lastMessageTime = 0;
  let lastMessage = "";
  const DEBOUNCE_MS = 100; // Don't show same message within 100ms

  return () => {
    const snackbar = useSnackbar();

    return {
      showMessageOnce(message: string) {
        const now = Date.now();
        if (message === lastMessage && now - lastMessageTime < DEBOUNCE_MS) {
          return; // Skip duplicate message
        }
        lastMessage = message;
        lastMessageTime = now;
        snackbar.showMessage(message);
      },
    };
  };
})();

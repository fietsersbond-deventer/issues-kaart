/**
 * Shared snackbar handler
 */
export const useSharedSnackbar = (() => {
  return () => {
    const snackbar = useSnackbar();

    return {
      showMessage(message: string) {
        snackbar.showMessage(message);
      },
      showPersistent(message: string, color: string = "warning") {
        snackbar.showPersistent(message, color);
      },
    };
  };
})();

interface SnackbarState {
  show: boolean;
  text: string;
  color?: string;
  timeout?: number; // Add timeout support
}

const snackbar = ref<SnackbarState>({
  show: false,
  text: "",
  color: "success",
  timeout: 4000, // Default timeout
});

export function useSnackbar() {
  function showMessage(
    text: string,
    color: string = "success",
    timeout: number = 4000
  ) {
    snackbar.value = {
      show: true,
      text,
      color,
      timeout,
    };
  }

  function showPersistent(text: string, color: string = "warning") {
    snackbar.value = {
      show: true,
      text,
      color,
      timeout: -1, // -1 means persistent (no auto-hide)
    };
  }

  function hide() {
    snackbar.value.show = false;
  }

  function showSuccess(text: string) {
    showMessage(text, "success");
  }

  function showError(text: string) {
    showMessage(text, "error");
  }

  return {
    snackbar,
    showMessage,
    showPersistent,
    hide,
    showSuccess,
    showError,
  };
}

import { ref } from 'vue'

interface SnackbarState {
  show: boolean
  text: string
  color?: string
}

const snackbar = ref<SnackbarState>({
  show: false,
  text: '',
  color: 'success'
})

export function useSnackbar() {
  function showMessage(text: string, color: string = 'success') {
    snackbar.value = {
      show: true,
      text,
      color
    }
  }

  function showSuccess(text: string) {
    showMessage(text, 'success')
  }

  function showError(text: string) {
    showMessage(text, 'error')
  }

  return {
    snackbar,
    showMessage,
    showSuccess,
    showError
  }
}
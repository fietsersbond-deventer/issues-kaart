import { ref } from 'vue'

const isEditing = ref(false)

export const useIsEditing = () => {
  const setEditing = (value: boolean) => {
    isEditing.value = value
  }

  const toggleEditing = () => {
    isEditing.value = !isEditing.value
  }

  return {
    isEditing,
    setEditing,
    toggleEditing
  }
}

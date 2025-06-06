export const useIsEditing = () => {
  const { status } = useAuth();
  const isEditing = useState<boolean>("isEditing", () => false);
  const setEditing = (value: boolean) => {
    isEditing.value = value;
  };

  const toggleEditing = () => {
    isEditing.value = !isEditing.value;
  };

  watch(status, () => {
    isEditing.value = false; // Reset editing state when authenticated
  });

  return {
    isEditing,
    setEditing,
    toggleEditing,
  };
};

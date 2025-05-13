export function useSessionApi() {
  const { token } = useAuth();

  const headers = computed(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value?.replace("Bearer ", "")}`,
  }));

  return useFetch('/api/auth/session', {
    headers: headers.value
  });
}
export default defineNuxtRouteMiddleware(async (_to) => {
  const { data: session } = useSessionApi();

  if (!session.value?.user?.role || session.value.user.role !== 'admin') {
    return navigateTo('/kaart');
  }
});
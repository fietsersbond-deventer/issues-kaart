export default defineNuxtRouteMiddleware(async (_to) => {
  const { data: session } = useSessionApi();

  console.log("session", session.value);

  if (!session.value?.user?.role || session.value.user.role !== "admin") {
    return navigateTo("/");
  }
});

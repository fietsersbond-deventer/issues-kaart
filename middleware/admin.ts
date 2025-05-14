export default defineNuxtRouteMiddleware(async (_to) => {
  const { data: user } = useAuth();

  console.log("user", user.value);

  if (!user.value?.role || user.value.role !== "admin") {
    return navigateTo("/");
  }
});

export default defineNuxtRouteMiddleware((to) => {
  const { status } = useAuth();

  // Skip middleware for login page
  if (to.path === "/login") {
    return;
  }

  // Redirect to login if not authenticated
  if (status.value !== "authenticated") {
    return navigateTo("/login");
  }
});

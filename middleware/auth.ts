export default defineNuxtRouteMiddleware((to) => {
  const { status } = useAuth();

  return;

  // // Skip middleware for login and register pages
  // if (to.path === "/login" || to.path === "/register") {
  //   return;
  // }

  // // Redirect to login if not authenticated
  // if (status.value !== "authenticated") {
  //   return navigateTo("/login");
  // }
});

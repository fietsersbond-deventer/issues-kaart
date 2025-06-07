export const useBreadcrumbs = () => {
  const route = useRoute();
  const router = useRouter();

  const breadcrumbs = computed(() => {
    const pathArray = route.path.split("/").filter(Boolean);
    const items = [
      {
        title: "Home",
        disabled: route.path === "/",
        to: "/",
      },
    ];

    const crumbs = pathArray.map((path, index) => {
      const fullPath = "/" + pathArray.slice(0, index + 1).join("/");
      const currentRoute = router.resolve(fullPath);
      const title = index === pathArray.length - 1 
        ? (route.meta.title as string) ?? path.charAt(0).toUpperCase() + path.slice(1)
        : (currentRoute.meta.navTitle as string) ?? path.charAt(0).toUpperCase() + path.slice(1);
      
      return {
        title,
        disabled: index === pathArray.length - 1,
        to: fullPath,
      };
    });

    return [...items, ...crumbs];
  });

  return {
    breadcrumbs,
  };
};

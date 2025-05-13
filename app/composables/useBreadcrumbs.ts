import { computed } from "vue";
import { useRoute } from "vue-router";

export const useBreadcrumbs = () => {
  const route = useRoute();

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
      return {
        title:
          (route.meta.title as string) ??
          path.charAt(0).toUpperCase() + path.slice(1),
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

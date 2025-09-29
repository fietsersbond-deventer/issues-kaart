import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

export const useBreadcrumbs = () => {
  const route = useRoute();
  const router = useRouter();

  const breadcrumbs = computed(() => {
    const pathArray = route.path.split("/").filter(Boolean);
    const items = [
      {
        title: "Deventer onderwerpen",
        disabled: route.path === "/",
        to: "/",
      },
    ];

    const crumbs = pathArray
      .map((path, index) => {
        const fullPath = "/" + pathArray.slice(0, index + 1).join("/");
        const currentRoute = router.resolve(fullPath);
        const title =
          index === pathArray.length - 1
            ? (route.meta.title as string) ?? path
            : (currentRoute.meta.navTitle as string) ?? path;

        return {
          title,
          disabled: index === pathArray.length - 1,
          to: fullPath,
        };
      })
      .filter(({ title }) => title !== "kaart" && title !== "Beheer"); // Remove consecutive duplicates

    return [...items, ...crumbs];
  });

  return {
    breadcrumbs,
  };
};

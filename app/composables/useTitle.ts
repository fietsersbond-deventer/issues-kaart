import { get } from "@vueuse/core";

const currentTitle = ref("");

export const useTitle = (title: MaybeRef<string>) => {
  const { organization } = useRuntimeConfig().public;
  const titleTemplate = `%s - ${organization.name}`;
  useHead({
    title,
    titleTemplate,
  });
  watch(
    () => get(title),
    () => {
      if (get(title)) {
        currentTitle.value = get(title);
      }
    },
    { immediate: true }
  );

  return {
    currentTitle,
  };
};

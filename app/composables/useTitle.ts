import { get } from "@vueuse/core";

const currentTitle = ref("");

export const useTitle = (title: MaybeRef<string>) => {
  const titleTemplate = `%s - Fietsersbond Deventer`;
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

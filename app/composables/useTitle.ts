export const useTitle = (title: string) => {
  const completeTitle = `${title} - Fietsersbond Deventer`;
  useHead({ title: completeTitle });
  definePageMeta({
    title: completeTitle,
  });
};

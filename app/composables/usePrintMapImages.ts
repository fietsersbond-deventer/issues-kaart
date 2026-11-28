import type { Ref } from "vue";
import type { PrintIssue } from "~~/shared/types/Issue";

/**
 * Map images (PNG data URLs by issue id) for the print. Made once, as soon as
 * they are needed: when enabled and there are issues.
 */
export function usePrintMapImages(
  issues: Ref<PrintIssue[]>,
  enabled: () => boolean,
) {
  const { categories } = storeToRefs(useCategories());
  const mapImages = ref(new Map<number, string>());
  const renderingMaps = ref(false);

  watch(
    () => enabled() && issues.value.length > 0,
    async (needsMaps) => {
      if (!needsMaps || renderingMaps.value || mapImages.value.size) return;
      renderingMaps.value = true;
      try {
        // The map style needs the category; without one there is no image.
        await renderIssueMapImages(
          issues.value.flatMap((issue) => {
            const legend = categories.value?.find(
              (category) => category.id === issue.legend_id,
            );
            return legend ? [{ ...issue, legend }] : [];
          }),
          {
            onImage: (id, dataUrl) => {
              mapImages.value = new Map(mapImages.value).set(id, dataUrl);
            },
          },
        );
      } catch (renderError) {
        console.error("Failed to render map images:", renderError);
      } finally {
        renderingMaps.value = false;
      }
    },
  );

  return { mapImages, renderingMaps };
}

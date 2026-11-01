import type { Ref } from "vue";
import { isExistingIssue, type Issue, type NewIssue } from "~~/shared/types/Issue";
import { slugify } from "~~/shared/utils/slug";

export function useIssueSlug(issue: Ref<Issue | NewIssue>) {
  const isChecking = ref(false);
  const error = ref("");
  const { getUniqueSlug } = useIssuesMethods();
  let initialized = Boolean(issue.value.slug);
  let checkSequence = 0;

  watch(
    () => issue.value.title,
    (title) => {
      if (!initialized && title.trim()) {
        issue.value.slug = slugify(title);
        initialized = true;
      }
    },
    { immediate: true },
  );

  function onInput() {
    initialized = true;
    checkSequence++;
    isChecking.value = false;
    error.value = "";
  }

  async function checkOnBlur() {
    const slug = issue.value.slug ?? "";
    const sequence = ++checkSequence;
    if (!slug.trim()) {
      error.value = "URL-slug is verplicht";
      isChecking.value = false;
      return;
    }

    isChecking.value = true;
    error.value = "";
    try {
      const result = await getUniqueSlug(
        slug,
        isExistingIssue(issue.value) ? issue.value.id : undefined,
      );
      if (sequence !== checkSequence || issue.value.slug !== slug) return;
      if (result.slug !== slug) issue.value.slug = result.slug;
    } catch (caughtError) {
      if (sequence !== checkSequence) return;
      console.error("Failed to validate issue slug:", caughtError);
      error.value = "URL-slug kon niet gecontroleerd worden";
    } finally {
      if (sequence === checkSequence) isChecking.value = false;
    }
  }

  return {
    isChecking,
    error,
    isValid: computed(() => !isChecking.value && !error.value),
    onInput,
    checkOnBlur,
  };
}

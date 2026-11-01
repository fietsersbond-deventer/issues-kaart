import type { Ref } from "vue";
import { isExistingIssue, type Issue, type NewIssue } from "~~/shared/types/Issue";
import { slugify } from "~~/shared/utils/slug";

export function useIssueSlug(issue: Ref<Issue | NewIssue>) {
  const isGenerating = ref(false);
  const isChecking = ref(false);
  const error = ref("");
  const { getUniqueSlug } = useIssuesMethods();
  let initialized = Boolean(issue.value.slug);
  let sequence = 0;
  let titleTimer: ReturnType<typeof setTimeout> | undefined;

  function cancelTitleTimer() {
    if (titleTimer) clearTimeout(titleTimer);
    titleTimer = undefined;
    isGenerating.value = false;
  }

  function onInput() {
    initialized = true;
    sequence++;
    cancelTitleTimer();
    isChecking.value = false;
    error.value = "";
  }

  async function setGeneratedSlug(title: string, generationSequence: number) {
    try {
      const result = await getUniqueSlug(
        slugify(title),
        isExistingIssue(issue.value) ? issue.value.id : undefined,
      );
      if (
        generationSequence !== sequence ||
        initialized ||
        issue.value.title !== title
      ) return;
      issue.value.slug = result.slug;
      initialized = true;
    } catch (caughtError) {
      if (generationSequence !== sequence) return;
      console.error("Failed to generate issue slug:", caughtError);
      error.value = "URL-slug kon niet gecontroleerd worden";
    } finally {
      if (generationSequence === sequence) {
        isGenerating.value = false;
        isChecking.value = false;
      }
    }
  }

  function generateOnBlur() {
    if (initialized || !issue.value.title.trim()) return;
    cancelTitleTimer();
    const generationSequence = ++sequence;
    isChecking.value = true;
    error.value = "";
    void setGeneratedSlug(issue.value.title, generationSequence);
  }

  watch(
    () => issue.value.title,
    (title) => {
      if (initialized) return;
      cancelTitleTimer();
      const generationSequence = ++sequence;
      isChecking.value = false;
      if (!title.trim()) return;

      isGenerating.value = true;
      error.value = "";
      titleTimer = setTimeout(() => {
        titleTimer = undefined;
        isChecking.value = true;
        void setGeneratedSlug(title, generationSequence);
      }, 2000);
    },
    { immediate: true },
  );

  async function checkOnBlur() {
    const slug = issue.value.slug ?? "";
    const checkSequence = ++sequence;
    cancelTitleTimer();
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
      if (checkSequence !== sequence || issue.value.slug !== slug) return;
      if (result.slug !== slug) issue.value.slug = result.slug;
    } catch (caughtError) {
      if (checkSequence !== sequence) return;
      console.error("Failed to validate issue slug:", caughtError);
      error.value = "URL-slug kon niet gecontroleerd worden";
    } finally {
      if (checkSequence === sequence) isChecking.value = false;
    }
  }

  return {
    isGenerating,
    isChecking,
    error,
    isValid: computed(() =>
      !isGenerating.value && !isChecking.value && !error.value,
    ),
    onInput,
    generateOnBlur,
    checkOnBlur,
  };
}

import type { AdminTextEntry, TextEntry } from "~~/shared/types/Text";

const TEXTS_KEY = "texts";

// Haalt de teksten op en vult de cache. Een component met useFetch is tijdens
// SSR asynchroon; gebruik daarom useCachedTexts in layout-componenten die
// synchroon moeten renderen (zoals de app-bar) en laad de teksten in app.vue.
export function useTexts() {
  const { token } = useAuth();
  const { data: texts, refresh } = useFetch<TextEntry[]>("/api/texts", {
    key: TEXTS_KEY,
  });

  const headers = computed(() => {
    if (!token.value) {
      return undefined;
    }

    return {
      Authorization: `Bearer ${token.value.replace(/^Bearer\s+/i, "")}`,
    };
  });

  function getText(key: string): TextEntry | undefined {
    return texts.value?.find((entry) => entry.key === key);
  }

  async function updateText(key: string, text: string) {
    const entry = await $fetch<TextEntry>(`/api/texts/${key}`, {
      method: "PATCH",
      body: { text },
      headers: headers.value,
    });
    await refresh();
    return entry;
  }

  return { texts, getText, updateText, refresh };
}

export function useCachedTexts() {
  const { data: texts } = useNuxtData<TextEntry[]>(TEXTS_KEY);

  function getText(key: string): TextEntry | undefined {
    return texts.value?.find((entry) => entry.key === key);
  }

  return { texts, getText };
}

export function useAdminTexts() {
  const { token } = useAuth();

  const headers = computed(() => {
    if (!token.value) {
      return undefined;
    }

    return {
      Authorization: `Bearer ${token.value.replace(/^Bearer\s+/i, "")}`,
    };
  });

  return useFetch<AdminTextEntry[]>("/api/admin/texts", { headers });
}

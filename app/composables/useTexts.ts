import type { AdminTextEntry, TextEntry } from "~/types/Text";

export function useTexts() {
  const { token } = useAuth();
  const { data: texts, refresh } = useFetch<TextEntry[]>("/api/texts");

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

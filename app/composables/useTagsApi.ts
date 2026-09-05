export type Tag = {
  tag: string;
  label: string | null;
  description: string | null;
  icon: string | null;
};

export const useTagsApi = () => {
  const { token } = useAuth();

  const headers = computed(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value?.replace("Bearer ", "")}`,
  }));

  const { data: tags, refresh: refreshTags } = useFetch<Tag[]>("/api/tags", {
    default: () => [],
    headers: headers.value,
  });

  async function list() {
    const response = await $fetch<Tag[]>("/api/tags", {
      headers: headers.value,
    });
    tags.value = response;
    return response;
  }

  function getTag(slug: string): Tag {
    return (
      tags.value?.find((item) => item.tag === slug) ?? {
        tag: slug,
        label: slug,
        description: null,
        icon: null,
      }
    );
  }

  async function create(payload: {
    tag: string;
    label?: string | null;
    description?: string | null;
    icon?: string | null;
  }) {
    const result = await $fetch<Tag>("/api/tags", {
      method: "POST",
      headers: headers.value,
      body: payload,
    });
    await refreshTags();
    return result;
  }

  async function update(
    tag: string,
    payload: {
      tag?: string;
      label?: string | null;
      description?: string | null;
      icon?: string | null;
    },
  ) {
    const result = await $fetch<Tag>(`/api/tags/${encodeURIComponent(tag)}`, {
      method: "PATCH",
      headers: headers.value,
      body: payload,
    });
    await refreshTags();
    return result;
  }

  async function remove(tag: string) {
    const result = await $fetch<{ success: boolean }>(
      `/api/tags/${encodeURIComponent(tag)}`,
      {
        method: "DELETE",
        headers: headers.value,
      },
    );
    if (result.success) {
      await refreshTags();
    }
    return result;
  }

  return {
    tags,
    list,
    getTag,
    create,
    update,
    remove,
  };
};

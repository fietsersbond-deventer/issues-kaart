import type { Tag } from "~~/shared/types/Tag";

export const useTagsApi = () => {
  const { token } = useAuth();

  const headers = computed(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value?.replace("Bearer ", "")}`,
  }));

  const { data: tags, refresh: refreshTags } = useFetch<Tag[]>("/api/tags", {
    default: () => [],
  });

  const list = computed(() => tags.value.map((tag) => tag.tag));

  function getTag(slug: string): Tag {
    return (
      tags.value?.find((item) => item.tag === slug) ?? {
        id: -1,
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
    tagId: number,
    payload: {
      tag?: string;
      label?: string | null;
      description?: string | null;
      icon?: string | null;
    },
  ) {
    const result = await $fetch<Tag>(`/api/tags/${tagId}`, {
      method: "PATCH",
      headers: headers.value,
      body: payload,
    });
    await refreshTags();
    return result;
  }

  async function remove(tagId: number) {
    const result = await $fetch<{ success: boolean }>(
      `/api/tags/${tagId}`,
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

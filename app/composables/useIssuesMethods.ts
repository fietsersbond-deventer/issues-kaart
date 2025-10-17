import type { Issue } from "@/types/Issue";

/**
 * CRUD methods for issues - available without creating a store
 * Use this when you only need the methods and don't need to subscribe to issues data
 */
export function useIssuesMethods() {
  const { token } = useAuth();

  const headers = computed(() => {
    if (!token.value) return undefined;
    // Remove "Bearer " if it's already there, then add it back
    const cleanToken = token.value.replace(/^Bearer\s+/i, "");
    return {
      Authorization: `Bearer ${cleanToken}`,
    };
  });

  function get(id: number | string) {
    return $fetch<Issue>(`/api/issues/${id}`, {
      method: "GET",
      headers: headers.value,
    });
  }

  async function create(body: Issue) {
    const issue = await $fetch<Issue>("/api/issues", {
      method: "POST",
      body,
      headers: headers.value,
    });
    return issue;
  }

  async function update(id: number, body: Issue) {
    const issue = await $fetch<Issue>(`/api/issues/${id}`, {
      method: "PATCH",
      body,
      headers: headers.value,
    });
    return issue;
  }

  async function remove(id: number) {
    const result = await $fetch<{ id: number }>(`/api/issues/${id}`, {
      method: "DELETE",
      headers: headers.value,
    });
    return { id: result.id };
  }

  function getImageUrl(id: number): string {
    return `/api/issues/${id}/image`;
  }

  return {
    get,
    create,
    update,
    remove,
    getImageUrl,
  };
}

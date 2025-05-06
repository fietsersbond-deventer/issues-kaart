import type { Issue } from "@/types/Issue";

export const useIssueApi = () => {
  const { token } = useAuth();

  const { data: issues, refresh: refreshIssues } =
    useFetch<Issue[]>("/api/issues");

  function refresh() {
    refreshIssues();
  }

  function get(id: string) {
    return $fetch<Issue>(`/api/issues/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  async function create(body: Issue) {
    const issue = await $fetch<Issue>("/api/issues", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body,
    });
    refresh();
    return issue;
  }

  async function update(id: string, data: Partial<Issue>) {
    const issue = await $fetch<Issue>(`/api/issues/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: data,
    });

    refresh();
    return issue;
  }

  async function remove(id: string) {
    const result = await $fetch<{ id: string }>(`/api/issues/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
    });
    refresh();
    return { id: result.id };
  }

  return {
    issues,
    get,
    create,
    update,
    remove,
  };
};

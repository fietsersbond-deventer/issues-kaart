import type { Issue } from "@/types/Issue";

export const useIssueApi = () => {
  const { token } = useAuth();

  function list() {
    return $fetch<Issue[]>("/api/issues", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
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
    console.log("issue", issue);
    return issue;
  }

  function update(id: string, data: Issue) {
    return $fetch<Issue>(`/api/issues/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(data),
    });
  }

  function remove(id: string) {
    return useFetch<{ id: string }>(`/api/issues/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
    });
  }

  return {
    list,
    get,
    create,
    update,
    remove,
  };
};

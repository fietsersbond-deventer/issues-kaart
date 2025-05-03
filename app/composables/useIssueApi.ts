import type { Issue } from "@/types/Issue";

export const useIssueApi = () => {
  const { token } = useAuth();

  function list() {
    return useFetch<Issue[]>("/api/issues", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  function get(id: string) {
    return useFetch<Issue>(`/api/issues/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  function create(data: Issue) {
    return useFetch<Issue>("/api/issues", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(data),
    });
  }

  function update(id: string, data: Issue) {
    return useFetch<Issue>(`/api/issues/${id}`, {
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

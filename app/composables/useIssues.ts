import { defineStore } from "pinia";

import type { Issue } from "@/types/Issue";

export const useIssues = defineStore("issues", () => {
  const { token } = useAuth();

  const headers = computed(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value?.replace("Bearer ", "")}`,
  }));

  const { data: issues, refresh: refreshIssues } =
    useFetch<Issue[]>("/api/issues");

  function refresh() {
    refreshIssues();
  }

  function get(id: number | string) {
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
      headers: headers.value,
      body,
    });
    refresh();
    return issue;
  }

  async function update(id: number | string, data: Partial<Issue>) {
    const issue = await $fetch<Issue>(`/api/issues/${id}`, {
      method: "PATCH",
      headers: headers.value,
      body: data,
    });

    refresh();
    return issue;
  }

  async function remove(id: number | string) {
    const result = await $fetch<{ id: number }>(`/api/issues/${id}`, {
      method: "DELETE",
      headers: headers.value,
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
});

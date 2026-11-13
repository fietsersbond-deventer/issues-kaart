import type { Comment } from "~~/shared/types/Comment";

export function useCommentsApi() {
  const { token } = useAuth();

  const authHeaders = computed(() => {
    if (!token.value) return undefined;
    const cleanToken = token.value.replace(/^Bearer\s+/i, "");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanToken}`,
    };
  });

  async function list(issueId: number): Promise<Comment[]> {
    return await $fetch<Comment[]>(`/api/issues/${issueId}/comments`, {
      method: "GET",
      headers: authHeaders.value,
    });
  }

  async function create(issueId: number, body: string): Promise<Comment> {
    return await $fetch<Comment>(`/api/issues/${issueId}/comments`, {
      method: "POST",
      headers: authHeaders.value,
      body: { body },
    });
  }

  async function update(commentId: number, body: string): Promise<Comment> {
    return await $fetch<Comment>(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: authHeaders.value,
      body: { body },
    });
  }

  async function remove(
    commentId: number,
    hard = false,
  ): Promise<{ id: number; deleted: boolean; soft?: boolean }> {
    return await $fetch<{ id: number; deleted: boolean; soft?: boolean }>(
      `/api/comments/${commentId}${hard ? "?hard=true" : ""}`,
      {
        method: "DELETE",
        headers: authHeaders.value,
      },
    );
  }

  return {
    list,
    create,
    update,
    remove,
  };
}

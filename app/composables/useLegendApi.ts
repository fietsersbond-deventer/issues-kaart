import type { Legend } from "~~/server/database/schema";

export function useLegendApi() {
  const { token } = useAuth();

  const headers = computed(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value?.replace("Bearer ", "")}`,
  }));

  async function getAll() {
    return await $fetch<Legend[]>("/api/legends");
  }

  async function create(legend: Partial<Legend>) {
    return await $fetch<Legend>("/api/legends", {
      method: "POST",
      body: legend,
      headers: headers.value,
    });
  }

  async function update(id: number, updates: Partial<Legend>) {
    return await $fetch<Legend>(`/api/legends/${id}`, {
      method: "PATCH",
      body: updates,
      headers: headers.value,
    });
  }

  async function remove(id: number) {
    return await $fetch<{ success: boolean }>(`/api/legends/${id}`, {
      method: "DELETE",
      headers: headers.value,
    });
  }

  return {
    getAll,
    create,
    update,
    remove,
  };
}

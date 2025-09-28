import type { Issue, Legend } from "~~/server/database/schema";

export type LegendUsage = Record<
  number,
  {
    usage_count: number;
    used_by_issues: Array<{ id: number; title: string }>;
  }
>;

export const useLegends = defineStore("categories", () => {
  const { token } = useAuth();

  const headers = computed(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value?.replace("Bearer ", "")}`,
  }));

  const { data: legends } = useFetch<Legend[]>("/api/legends", {});

  async function getUsage() {
    const result = await $fetch<
      Record<
        string,
        {
          usage_count: number;
          used_by_issues: Array<{ id: number; title: string }>;
        }
      >
    >("/api/admin/legends/usage", {
      headers: headers.value,
    });
    return result as LegendUsage;
  }

  function create(legend: Partial<Legend>) {
    return $fetch<Legend>("/api/legends", {
      method: "POST",
      body: legend,
      headers: headers.value,
    });
  }

  function update(id: number, updates: Partial<Legend>) {
    return $fetch<Legend>(`/api/legends/${id}`, {
      method: "PATCH",
      body: updates,
      headers: headers.value,
    });
  }

  function remove(id: number) {
    return $fetch<{ success: boolean }>(`/api/legends/${id}`, {
      method: "DELETE",
      headers: headers.value,
    });
  }

  return {
    legends,
    getUsage,
    create,
    update,
    remove,
  };
});

interface User {
  id: number;
  username: string;
  name: string | null;
  role: string;
  created_at: string;
}

export const useUsersApi = () => {
  const { token } = useAuth();

  const headers = computed(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value?.replace("Bearer ", "")}`,
  }));

  const { data: users, refresh: refreshUsers } = useFetch<User[]>(
    "/api/admin/users",
    {
      headers: headers.value,
    }
  );

  function refresh() {
    refreshUsers();
  }

  async function create(body: {
    username: string;
    password: string;
    name?: string | null;
    role?: string;
  }) {
    const user = await $fetch<User>("/api/admin/users", {
      method: "POST",
      headers: headers.value,
      body,
    });
    refresh();
    return user;
  }

  async function update(id: number, body: {
    username: string;
    name?: string | null;
    role: string;
  }) {
    const user = await $fetch<User>(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: headers.value,
      body,
    });
    refresh();
    return user;
  }

  async function remove(id: number) {
    const result = await $fetch<{ success: boolean }>(
      `/api/admin/users/${id}`,
      {
        method: "DELETE",
        headers: headers.value,
      }
    );
    refresh();
    return result;
  }

  return {
    users,
    create,
    update,
    remove,
  };
};

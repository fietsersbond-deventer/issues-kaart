interface User {
  id: number;
  username: string;
  created_at: string;
}

export const useUsersApi = () => {
  const { token } = useAuth();

  const { data: users, refresh: refreshUsers } = useFetch<User[]>(
    "/api/admin/users",
    {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    }
  );

  function refresh() {
    refreshUsers();
  }

  async function create(body: { username: string; password: string }) {
    const user = await $fetch<User>("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
      }
    );
    refresh();
    return result;
  }

  return {
    users,
    create,
    remove,
  };
};

export type Role = "admin" | "user";

export interface RoleDefinition {
  name: Role;
  label: string;
  description: string;
}

const roles: RoleDefinition[] = [
  {
    name: "admin",
    label: "Administrator",
    description: "Full system access including user management",
  },
  {
    name: "user",
    label: "User",
    description: "Standard user access",
  },
];

export function useRoles() {
  const { data: user } = useAuth();

  const currentRole = computed<Role | null>(() => {
    return (user.value?.role as Role) || null;
  });

  const isAdmin = computed(() => currentRole.value === "admin");

  function hasRole(role: Role): boolean {
    return currentRole.value === role;
  }

  function getRoleInfo(role: Role): RoleDefinition | undefined {
    return roles.find((r) => r.name === role);
  }

  function getAllRoles(): RoleDefinition[] {
    return [...roles];
  }

  return {
    currentRole,
    isAdmin,
    hasRole,
    getRoleInfo,
    getAllRoles,
  };
}

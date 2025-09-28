import { defineStore } from "pinia";

import { useWebSocket } from "@vueuse/core";

import type { ExistingIssue, Issue } from "@/types/Issue";

export const useIssues = defineStore("issues", () => {
  const { token } = useAuth();

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const websocketUrl = `${protocol}://${window.location.host}/ts/notify`;

  const { data: wsData } = useWebSocket(websocketUrl, {
    autoReconnect: true,
    onConnected() {
      console.log("WebSocket connected to", websocketUrl);
    },
    onDisconnected() {
      console.log("WebSocket disconnected");
    },
    onError(error) {
      console.error("WebSocket error:", error);
    },
  });

  const issues = ref<Issue[]>([]);
  const snackbar = useSnackbar();

  const { data, refresh: refreshIssues } = useFetch<Issue[]>("/api/issues");

  watch(wsData, (data) => {
    const issue = (JSON.parse(data as string) as any).payload as ExistingIssue;
    if (issue.geometry && typeof issue.geometry === "string") {
      issue.geometry = JSON.parse(issue.geometry);
    }
    switch ((JSON.parse(data as string) as any).type) {
      case "issue-created":
        issues.value.push(issue);
        snackbar.showMessage(`Onderwerp ${issue.title} aangemaakt`);
        break;
      case "issue-modified":
        {
          const existingIndex = issues.value.findIndex(
            (i) => i.id === issue.id
          );
          if (existingIndex !== -1) {
            issues.value[existingIndex] = issue;
            snackbar.showMessage(`Onderwerp ${issue.title} gewijzigd`);
          } else {
            issues.value.push(issue);
            snackbar.showMessage(`Onderwerp ${issue.title} aangemaakt`);
          }
        }
        break;
      case "issue-deleted":
        {
          const issueId = (JSON.parse(data as string) as any).payload as number;
          issues.value = issues.value.filter((i) => i.id !== issueId);
          snackbar.showMessage(`Onderwerp ${issueId} verwijderd`);
        }
        break;
      default:
        console.warn("Unknown WebSocket message type:", data);
    }
  });

  const headers = computed(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value?.replace("Bearer ", "")}`,
  }));

  watch(
    data,
    (newData) => {
      if (newData) {
        issues.value = newData;
      } else {
        issues.value = [];
      }
    },
    { immediate: true }
  );

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

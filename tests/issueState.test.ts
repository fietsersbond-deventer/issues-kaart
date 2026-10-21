// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import type { AnyWebSocketMessage } from "../shared/types/WebSocketMessages";
import { isNewIssue } from "../shared/types/Issue";
import { vueGlobals, withSetup } from "./helpers/vue";
let receive: (message: AnyWebSocketMessage) => void;
const data = ref<unknown[] | null>([]), categories = ref<unknown[]>([]), selected = ref<unknown>(null), status = ref("pending");
const refresh = vi.fn(), unsubscribe = vi.fn();
const socketStatus = ref("OPEN");
const isEditing = ref(false);
const wrappers: Array<{
    unmount(): void;
}> = [], stores: Array<{
    $dispose(): void;
}> = [];
beforeEach(() => {
    vueGlobals();
    vi.useFakeTimers();
    socketStatus.value = "OPEN";
    isEditing.value = false;
    data.value = [];
    categories.value = [];
    selected.value = null;
    status.value = "pending";
    vi.clearAllMocks();
    vi.stubGlobal("storeToRefs", (x: unknown) => x);
    vi.stubGlobal("useCategories", () => ({ categories }));
    vi.stubGlobal("useSelectedIssue", () => ({ issue: selected }));
    vi.stubGlobal("useIsEditing", () => ({ isEditing }));
    vi.stubGlobal("useFetch", () => ({ data, status, refresh }));
    vi.stubGlobal("useIssuesMethods", () => ({ create: vi.fn() }));
    vi.stubGlobal("isNewIssue", isNewIssue);
    vi.stubGlobal("useSharedIssuesWebSocket", () => ({ status: socketStatus, subscribe: (fn: typeof receive) => { receive = fn; return unsubscribe; } }));
});
afterEach(() => { stores.splice(0).forEach((s) => s.$dispose()); wrappers.splice(0).forEach((w) => w.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
const geometry = { type: "Point", coordinates: [6, 52] };
async function setup() { const { useIssues } = await import("../app/composables/useIssues"); const mounted = withSetup(() => useIssues()); wrappers.push(mounted.wrapper); stores.push(mounted.value); return mounted.value; }
const message = (type: string, payload: unknown) => receive({ type, payload } as AnyWebSocketMessage);
it("processes fetched rows, enriches categories reactively and clears unloaded data", async () => {
    data.value = [{ id: 1, title: "Issue", legend_id: 2, geometry: JSON.stringify(geometry), tags: [] }];
    const store = await setup();
    expect(store.issues[0]!.geometry).toEqual(geometry);
    expect(store.isLoaded).toBe(false);
    status.value = "success";
    categories.value = [{ id: 2, name: "Routes" }];
    await nextTick();
    expect(store.isLoaded).toBe(true);
    expect(store.issues[0]!.legend).toMatchObject({ name: "Routes" });
    store.refresh();
    expect(refresh).toHaveBeenCalledTimes(1);
    data.value = null;
    await nextTick();
    expect(store.issues).toEqual([]);
});
it("applies created/modified/deleted notifications and upserts unseen modifications", async () => {
    const store = await setup();
    message("issue-created", { id: 1, title: "One", geometry, tags: [] });
    message("issue-modified", { id: 1, title: "Updated", geometry, tags: [] });
    message("issue-modified", { id: 2, title: "Two", geometry, tags: [] });
    expect(store.issues.map((x) => x.title)).toEqual(["Updated", "Two"]);
    message("issue-deleted", { id: 1 });
    expect(store.issues.map((x) => x.id)).toEqual([2]);
});
it("keeps a single live preview per selected draft or saved issue and retains updates across page navigation until the store is disposed", async () => {
    const store = await setup();
    selected.value = { title: "Draft", tags: [], description: "text" };
    await nextTick();
    await vi.advanceTimersByTimeAsync(101);
    expect(store.issues).toHaveLength(1);
    selected.value = { title: "Changed", tags: [], description: "text" };
    await nextTick();
    await vi.advanceTimersByTimeAsync(101);
    expect(store.issues).toHaveLength(1);
    expect(store.issues[0]!.title).toBe("Changed");
    selected.value = { id: 1, title: "Saved", geometry, tags: [] };
    await nextTick();
    await vi.advanceTimersByTimeAsync(101);
    expect(store.issues).toHaveLength(2);
    selected.value = null;
    await nextTick();
    await vi.advanceTimersByTimeAsync(101);
    expect(store.issues).toHaveLength(2);
    wrappers[0]!.unmount();
    expect(unsubscribe).not.toHaveBeenCalled();
    message("issues-imported", { count: 27000, createdBy: "Admin", createdByUserId: 1 });
    expect(refresh).toHaveBeenCalledTimes(1);
    store.$dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
});
it("shows short own-action notifications, attributed remote notifications and ignores anonymous sessions", async () => {
    const showMessage = vi.fn(), showPersistent = vi.fn();
    const authenticated = ref("authenticated");
    vi.stubGlobal("useSharedSnackbar", () => ({ showMessage, showPersistent }));
    vi.stubGlobal("useAuth", () => ({ status: authenticated, data: ref({ id: "1" }) }));
    const { useIssueNotifications } = await import("../app/composables/useIssueNotifications");
    const mounted = withSetup(useIssueNotifications);
    wrappers.push(mounted.wrapper);
    for (const [type, field, name, text] of [["issue-created", "createdByUserId", "createdBy", "Onderwerp aangemaakt"], ["issue-modified", "modifiedByUserId", "modifiedBy", "Opgeslagen"], ["issue-deleted", "deletedByUserId", "deletedBy", "Verwijderd"]]) {
        message(type!, { id: 1, title: "Issue", [field!]: 1, [name!]: "Me" });
        expect(showMessage).toHaveBeenLastCalledWith(text);
        message(type!, { id: 1, title: "Issue", [field!]: 2, [name!]: "Other" });
        expect(showPersistent).toHaveBeenLastCalledWith(expect.stringContaining("Other"), "info");
    }
    authenticated.value = "unauthenticated";
    message("issue-deleted", { id: 1, title: "Issue", deletedByUserId: 1 });
    expect(showMessage).toHaveBeenCalledTimes(3);
});

it("refreshes the persisted snapshot after reconnect and does not duplicate creation notifications", async () => {
    const store = await setup();
    socketStatus.value = "CLOSED";
    await nextTick();
    socketStatus.value = "OPEN";
    await nextTick();
    expect(refresh).toHaveBeenCalledTimes(1);
    message("issue-created", { id: 1, title: "One", geometry, tags: [] });
    message("issue-created", { id: 1, title: "One", geometry, tags: [] });
    expect(store.issues.map((issue) => issue.id)).toEqual([1]);
});

it.each([undefined, 1])("preserves the active geometry after reconnect for issue %s", async (id) => {
    data.value = [{ id: 1, title: "Saved", geometry, tags: [] }];
    const store = await setup();
    const draft = { ...(id === undefined ? {} : { id }), title: "Local draft", description: "", geometry: { type: "Point", coordinates: [7, 53] }, tags: [] };
    isEditing.value = true;
    selected.value = draft;
    await nextTick();
    await vi.advanceTimersByTimeAsync(101);
    refresh.mockImplementationOnce(() => {
        data.value = [{ id: 1, title: "Saved", geometry, tags: [] }, { id: 2, title: "Remote update", geometry, tags: [] }];
    });
    socketStatus.value = "CLOSED";
    await nextTick();
    socketStatus.value = "OPEN";
    await nextTick();
    await vi.advanceTimersByTimeAsync(101);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store.issues.find((issue) => issue.id === id)).toEqual(draft);
    expect(store.issues.filter((issue) => issue.id === id)).toHaveLength(1);
    expect(store.issues.find((issue) => issue.id === 2)?.title).toBe("Remote update");

    isEditing.value = false;
    data.value = [{ id: 1, title: "Latest saved", geometry, tags: [] }];
    await nextTick();
    expect(store.issues).toEqual(data.value);
});

it("refreshes once for a completed 27000-object import instead of receiving per-object updates", async () => {
    data.value = Array.from({ length: 27000 }, (_, index) => ({ id: index + 1, title: "Line", geometry: { type: "LineString", coordinates: [[4, 52], [5, 53]] }, tags: [] }));
    const store = await setup();
    expect(store.issues).toHaveLength(27000);
    message("issues-imported", { count: 27000, createdBy: "Admin", createdByUserId: 1 });
    await nextTick();
    expect(refresh).toHaveBeenCalledTimes(1);
    message("issue-modified", { id: 27000, title: "Changed", geometry, tags: [] });
    expect(store.issues[26999]!.title).toBe("Changed");
});

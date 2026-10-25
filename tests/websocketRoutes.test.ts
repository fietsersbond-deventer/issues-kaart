import type { Peer } from "crossws";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { getEmitter } from "../server/utils/getEmitter";
import { getPeerSession } from "../server/utils/peerSession";
const verify = vi.hoisted(() => vi.fn());
vi.mock("../server/utils/verifyToken", () => ({ verifyToken: verify }));
type Handlers = {
    open(peer: Peer): unknown;
    close(peer: Peer): unknown;
    message(peer: Peer, message: {
        toString(): string;
    }): unknown;
    error(peer: Peer, error: Error): unknown;
};
let auth: Handlers, notify: Handlers;
function peer(id: string, token = "valid") { return { toString: () => id, send: vi.fn(), subscribe: vi.fn(), publish: vi.fn(), close: vi.fn(), request: { url: `http://localhost/ts/auth${token ? `?token=${encodeURIComponent(token)}` : ""}`, headers: new Headers() } }; }
const cast = (p: ReturnType<typeof peer>) => p as unknown as Peer;
beforeAll(async () => { vi.useFakeTimers(); vi.spyOn(console, "log").mockImplementation(() => { }); vi.spyOn(console, "error").mockImplementation(() => { }); vi.stubGlobal("defineWebSocketHandler", (handlers: Handlers) => handlers); auth = (await import("../server/routes/ts/auth")).default as unknown as Handlers; notify = (await import("../server/routes/ts/notify")).default as unknown as Handlers; });
afterAll(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); getEmitter().removeAllListeners(); });
it("rejects missing/malformed/expired tokens without registering a session", async () => {
    for (const [name, message, expected] of [["Error", "invalid", "Invalid"], ["TokenExpiredError", "expired", "expired"], ["Error", "JWS malformed", "Malformed"]]) {
        const error = new Error(message);
        error.name = name!;
        verify.mockRejectedValueOnce(error);
        const p = peer(`bad-${name}-${message}`);
        await auth.open(cast(p));
        expect(p.close).toHaveBeenCalledTimes(1);
        expect(p.send).toHaveBeenCalledWith(expect.stringContaining(expected!));
        expect(getPeerSession(p.toString())).toBeUndefined();
    }
    const missing = peer("missing", "");
    await auth.open(cast(missing));
    expect(missing.close).toHaveBeenCalledTimes(1);
});
it("authenticates clean tokens, initializes channels and cleans up sessions on close", async () => {
    const p = peer("authorized", "Bearer valid");
    verify.mockResolvedValueOnce({ id: 1, username: "test", name: "Test", role: "user" });
    await auth.open(cast(p));
    expect(verify).toHaveBeenLastCalledWith("valid");
    expect(getPeerSession("authorized")!.user.id).toBe(1);
    expect(p.subscribe).toHaveBeenCalledWith("presence");
    expect(p.subscribe).toHaveBeenCalledWith("editing-status");
    for (const data of [{ type: "get-peer-id" }, { type: "user-online" }, { type: "unknown" }])
        auth.message(cast(p), { toString: () => JSON.stringify(data) });
    auth.message(cast(p), { toString: () => "not JSON" });
    auth.error(cast(p), new Error("socket"));
    auth.close(cast(p));
    vi.advanceTimersByTime(1000);
    expect(getPeerSession("authorized")).toBeUndefined();
});
it("broadcasts one notification per connected peer and never sends to closed peers", () => {
    const a = peer("a"), b = peer("b");
    notify.open(cast(a));
    notify.open(cast(b));
    for (const [event, type] of [["issue:created", "issue-created"], ["issue:modified", "issue-modified"], ["issue:deleted", "issue-deleted"]]) {
        getEmitter().emit(event!, { id: 1, title: "Issue" });
        expect(a.send).toHaveBeenLastCalledWith(JSON.stringify({ type, payload: { id: 1, title: "Issue" } }));
    }
    expect(a.send).toHaveBeenCalledTimes(3);
    expect(b.send).toHaveBeenCalledTimes(3);
    notify.close(cast(a));
    getEmitter().emit("issue:created", { id: 2 });
    expect(a.send).toHaveBeenCalledTimes(3);
    expect(b.send).toHaveBeenCalledTimes(4);
    notify.close(cast(b));
});
it("broadcasts comment events to authenticated peers and never leaks to unauthenticated or closed peers", async () => {
    const authPeer1 = peer("auth-1", "valid");
    const authPeer2 = peer("auth-2", "valid");
    const unauthPeer = peer("unauth", "");
    verify.mockResolvedValue({ id: 1, username: "test", name: "Test", role: "user" });

    await auth.open(cast(authPeer1));
    await auth.open(cast(authPeer2));
    await auth.open(cast(unauthPeer));

    authPeer1.send.mockClear();
    authPeer2.send.mockClear();
    unauthPeer.send.mockClear();

    const commentData = { id: 10, issue_id: 1, body: "Comment text", author_id: 1, author_name: "Test", createdBy: "Test", createdByUserId: 1 };
    getEmitter().emit("comment:created", commentData);

    expect(authPeer1.send).toHaveBeenCalledWith(JSON.stringify({ type: "comment-created", payload: commentData }));
    expect(authPeer2.send).toHaveBeenCalledWith(JSON.stringify({ type: "comment-created", payload: commentData }));
    expect(unauthPeer.send).not.toHaveBeenCalled();

    auth.close(cast(authPeer1));
    authPeer1.send.mockClear();
    authPeer2.send.mockClear();

    const updateData = { id: 10, issue_id: 1, body: "Updated", author_id: 1, author_name: "Test", modifiedBy: "Test", modifiedByUserId: 1 };
    getEmitter().emit("comment:modified", updateData);

    expect(authPeer1.send).not.toHaveBeenCalled();
    expect(authPeer2.send).toHaveBeenCalledWith(JSON.stringify({ type: "comment-modified", payload: updateData }));

    const deleteData = { id: 10, issue_id: 1, deletedBy: "Test", deletedByUserId: 1, soft: true };
    getEmitter().emit("comment:deleted", deleteData);

    expect(authPeer1.send).not.toHaveBeenCalled();
    expect(authPeer2.send).toHaveBeenCalledWith(JSON.stringify({ type: "comment-deleted", payload: deleteData }));

    auth.close(cast(authPeer2));
});

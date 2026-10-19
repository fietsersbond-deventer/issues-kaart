import type { DatabaseSync } from "node:sqlite";
import type { Peer } from "crossws";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { admin, member, migratedDatabase, seed } from "./helpers/server";
import type { User } from "../server/database/schema";
import { cleanupStaleSessions, getAllPeerSessions, getPeerSession, removePeerSession, setPeerSession, updatePeerActivity } from "../server/utils/peerSession";
let db: DatabaseSync;
vi.mock("../server/utils/db", () => ({ getDb: () => db }));
let locks: typeof import("../server/utils/lockHandler");
let presence: typeof import("../server/utils/presenceHandler");
function peer(id: string) {
    return { toString: () => id, send: vi.fn(), publish: vi.fn(), subscribe: vi.fn(), close: vi.fn(), request: { url: "http://localhost/ts/auth", headers: new Headers() } };
}
const a = peer("a"), b = peer("b");
const asPeer = (p: ReturnType<typeof peer>) => p as unknown as Peer;
const user = (value = admin) => ({ ...value, password_hash: "not-public", created_at: new Date() }) as User;
const lastMessage = (p: ReturnType<typeof peer>) => JSON.parse(p.send.mock.calls.at(-1)![0]);
beforeAll(() => vi.useFakeTimers());
afterAll(() => vi.useRealTimers());
beforeEach(async () => {
    vi.spyOn(console, "log").mockImplementation(() => { });
    vi.spyOn(console, "error").mockImplementation(() => { });
    db = await migratedDatabase();
    seed(db);
    locks = await import("../server/utils/lockHandler");
    presence = await import("../server/utils/presenceHandler");
    setPeerSession("a", user());
    setPeerSession("b", user(member));
    a.send.mockClear();
    a.publish.mockClear();
    b.send.mockClear();
    b.publish.mockClear();
});
afterEach(() => {
    locks.cleanupLockForPeer(asPeer(a));
    locks.cleanupLockForPeer(asPeer(b));
    presence.cleanupPresenceForPeer(asPeer(a));
    presence.cleanupPresenceForPeer(asPeer(b));
    vi.advanceTimersByTime(1000);
    getAllPeerSessions().forEach((s) => removePeerSession(s.peerId));
    db.close();
    vi.restoreAllMocks();
});
describe("verified peer sessions, editing locks and presence", () => {
    it("tracks activity, expires idle sessions and removes disconnected peers", () => {
        const connected = getPeerSession("a")!.connectedAt;
        vi.advanceTimersByTime(500);
        updatePeerActivity("a");
        updatePeerActivity("missing");
        expect(getPeerSession("a")!.lastActivity).toBe(connected + 500);
        cleanupStaleSessions(200);
        expect(getPeerSession("b")).toBeUndefined();
        expect(getAllPeerSessions().map((s) => s.peerId)).toEqual(["a"]);
        removePeerSession("a");
        expect(getAllPeerSessions()).toEqual([]);
    });
    it("provides peer identity and subscribes new peers to existing lock state", () => {
        expect(locks.handleLockMessage(asPeer(a), { type: "get-peer-id" })).toBe(true);
        expect(lastMessage(a)).toEqual({ type: "peer-connected", payload: "a" });
        locks.initializeLockForPeer(asPeer(a));
        expect(a.subscribe).toHaveBeenCalledWith("editing-status");
        expect(lastMessage(a)).toEqual({ type: "editing-status", payload: {} });
    });
    it("takes identity from the verified session and rejects competing lock/unlock attempts", () => {
        expect(locks.handleLockMessage(asPeer(a), { type: "lockIssue", payload: { issueId: 1, username: "forged" } })).toBe(true);
        expect(lastMessage(a).payload[1]).toMatchObject({ username: admin.username, displayName: admin.name, peer: "a" });
        for (const type of ["lockIssue", "unlockIssue"])
            expect(locks.handleLockMessage(asPeer(b), { type, payload: { issueId: 1 } })).toBe(false);
        expect(lastMessage(b).payload[1].peer).toBe("a");
        expect(locks.handleLockMessage(asPeer(a), { type: "unlockIssue", payload: { issueId: 1 } })).toBe(true);
        expect(lastMessage(a).payload).toEqual({});
    });
    it("rejects unauthenticated/missing issue messages and ignores other domains", () => {
        removePeerSession("a");
        expect(locks.handleLockMessage(asPeer(a), { type: "lockIssue", payload: { issueId: 1 } })).toBe(false);
        expect(locks.handleLockMessage(asPeer(a), { type: "clearMyLocks" })).toBe(false);
        expect(locks.handleLockMessage(asPeer(b), { type: "lockIssue" })).toBe(false);
        expect(locks.handleLockMessage(asPeer(b), { type: "unknown" })).toBe(false);
    });
    it("clears only the reconnecting peer's locks and tolerates repeated cleanup", () => {
        locks.handleLockMessage(asPeer(a), { type: "lockIssue", issueId: 1 });
        locks.handleLockMessage(asPeer(b), { type: "lockIssue", payload: { issueId: 2 } });
        expect(locks.handleLockMessage(asPeer(a), { type: "clearMyLocks" })).toBe(true);
        expect(lastMessage(a).payload).toEqual({ 2: expect.objectContaining({ peer: "b" }) });
        expect(locks.handleLockMessage(asPeer(a), { type: "clearMyLocks" })).toBe(true);
        locks.cleanupLockForPeer(asPeer(b));
        vi.advanceTimersByTime(500);
        expect(JSON.parse(b.publish.mock.calls.at(-1)![1]).payload).toEqual({});
    });
    it("expires idle locks and allows another peer after the timeout", () => {
        locks.handleLockMessage(asPeer(a), { type: "lockIssue", payload: { issueId: 3 } });
        vi.advanceTimersByTime(15 * 60000 + 1);
        expect(locks.handleLockMessage(asPeer(b), { type: "lockIssue", payload: { issueId: 3 } })).toBe(true);
        expect(lastMessage(b).payload[3].peer).toBe("b");
        vi.advanceTimersByTime(16 * 60000);
        locks.initializeLockForPeer(asPeer(a));
        expect(lastMessage(a).payload).toEqual({});
    });
    it("broadcasts public presence from verified users and removes offline users", () => {
        presence.initializePresenceForPeer(asPeer(a));
        expect(a.subscribe).toHaveBeenCalledWith("presence");
        expect(presence.handlePresenceMessage(asPeer(a), { type: "user-online", payload: { username: "fake" } })).toBe(true);
        expect(lastMessage(a).payload).toEqual([expect.objectContaining({ userId: 1, username: admin.username })]);
        expect(lastMessage(a).payload[0]).not.toHaveProperty("password_hash");
        presence.handlePresenceMessage(asPeer(b), { type: "user-online" });
        expect(lastMessage(b).payload).toHaveLength(2);
        expect(presence.handlePresenceMessage(asPeer(a), { type: "user-offline" })).toBe(true);
        expect(JSON.parse(a.publish.mock.calls.at(-1)![1]).payload).toHaveLength(1);
        presence.cleanupPresenceForPeer(asPeer(b));
        vi.advanceTimersByTime(1000);
        expect(JSON.parse(b.publish.mock.calls.at(-1)![1]).payload).toEqual([]);
        expect(presence.handlePresenceMessage(asPeer(a), { type: "user-offline" })).toBe(true);
        expect(presence.handlePresenceMessage(asPeer(a), { type: "other" })).toBe(false);
        removePeerSession("a");
        expect(presence.handlePresenceMessage(asPeer(a), { type: "user-online" })).toBe(false);
    });
});

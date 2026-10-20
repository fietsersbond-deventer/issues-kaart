import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import type { DatabaseSync } from "node:sqlite";
import { admin, migratedDatabase, routeHarness, seed } from "./helpers/server";
let db: DatabaseSync;
vi.mock("../server/utils/db", () => ({ getDb: () => db }));
let h: ReturnType<typeof routeHarness>;
const sendMail = vi.fn().mockResolvedValue(undefined);
const strong = "sunrise!Giraffe!718!Harbour";
beforeEach(async () => {
    vi.stubEnv("NUXT_JWT_SECRET", "unit-test-secret-not-for-production");
    vi.spyOn(console, "error").mockImplementation(() => { });
    h = routeHarness();
    db = await migratedDatabase();
    seed(db);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = 1").run(bcrypt.hashSync(strong, 4));
    vi.stubGlobal("useNodeMailer", () => ({ sendMail }));
    sendMail.mockClear();
});
afterEach(() => { db.close(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
async function login() {
    const handler = (await import("../server/api/auth/login.post")).default;
    h.input.body = { username: admin.username, password: strong };
    return handler(h.event);
}
describe("authentication and password lifecycle", () => {
    it("issues verifiable access/refresh tokens without returning the password hash", async () => {
        const result = await login();
        const { verifyToken } = await import("../server/utils/verifyToken");
        expect(result.user).toEqual(admin);
        expect(result).not.toHaveProperty("password_hash");
        expect(await verifyToken(result.token)).toMatchObject(admin);
        const session = (await import("../server/api/auth/session.get")).default;
        vi.stubGlobal("verifyToken", verifyToken);
        h.input.headers.authorization = `Bearer ${result.token}`;
        expect(await session(h.event)).toEqual(admin);
    });
    it.each([{}, { username: "absent", password: strong }, { username: admin.username, password: "wrong" }])("rejects missing or invalid credentials %j", async (body) => {
        h.input.body = body;
        const handler = (await import("../server/api/auth/login.post")).default;
        await expect(handler(h.event)).rejects.toMatchObject({ statusCode: Object.keys(body).length ? 401 : 400 });
        expect(db.prepare("SELECT * FROM refresh_tokens").all()).toEqual([]);
    });
    it("refreshes once and rejects replay and missing tokens", async () => {
        const original = await login();
        const refresh = (await import("../server/api/auth/refresh.post")).default;
        h.input.body = {};
        await expect(refresh(h.event)).rejects.toMatchObject({ statusCode: 400 });
        h.input.body = { refreshToken: original.refreshToken };
        const next = await refresh(h.event);
        expect(next.user).toEqual(admin);
        expect(next.refreshToken).not.toBe(original.refreshToken);
        await expect(refresh(h.event)).rejects.toMatchObject({ statusCode: 401 });
    });
    it("rejects missing/invalid sessions and distinguishes expired access tokens", async () => {
        const session = (await import("../server/api/auth/session.get")).default;
        const { verifyToken } = await import("../server/utils/verifyToken");
        vi.stubGlobal("verifyToken", verifyToken);
        await expect(session(h.event)).rejects.toMatchObject({ statusCode: 401 });
        h.input.headers.authorization = "Bearer broken";
        await expect(session(h.event)).rejects.toMatchObject({ statusCode: 401 });
        const expired = await new SignJWT(admin).setProtectedHeader({ alg: "HS256" }).setExpirationTime(1).sign(new TextEncoder().encode(process.env.NUXT_JWT_SECRET));
        await expect(verifyToken(expired)).rejects.toMatchObject({ name: "TokenExpiredError" });
    });
    it("sets a user only for a verified bearer token in middleware", async () => {
        const { verifyToken } = await import("../server/utils/verifyToken");
        vi.stubGlobal("verifyToken", verifyToken);
        const middleware = (await import("../server/middleware/user")).default;
        await middleware(h.event);
        expect(h.event.context.user).toBeNull();
        h.input.headers.authorization = "Bearer bad";
        await middleware(h.event);
        expect(h.event.context.user).toBeNull();
        const result = await login();
        h.input.headers.authorization = `Bearer ${result.token}`;
        await middleware(h.event);
        expect(h.event.context.user).toMatchObject(admin);
    });
    it("checks password strength and rejects absent passwords", async () => {
        const handler = (await import("../server/api/auth/check-password.post")).default;
        await expect(handler(h.event)).rejects.toMatchObject({ statusCode: 400 });
        h.input.body = { password: "password" };
        expect(await handler(h.event)).toMatchObject({ isStrong: false, minimumScore: 3 });
        h.input.body = { password: strong };
        expect(await handler(h.event)).toMatchObject({ isStrong: true });
    });
    it("returns the same reset response for unknown accounts and replaces old tokens for known users", async () => {
        const request = (await import("../server/api/auth/reset-password/request.post")).default;
        await expect(request(h.event)).rejects.toMatchObject({ statusCode: 400 });
        h.input.body = { email: "unknown@example.test" };
        expect(await request(h.event)).toEqual({ success: true });
        expect(sendMail).not.toHaveBeenCalled();
        h.input.body = { email: admin.username };
        expect(await request(h.event)).toEqual({ success: true });
        const first = db.prepare("SELECT token FROM password_reset_tokens").get()!.token;
        await request(h.event);
        const tokens = db.prepare("SELECT token FROM password_reset_tokens").all();
        expect(tokens).toHaveLength(1);
        expect(tokens[0]!.token).not.toBe(first);
        expect(sendMail).toHaveBeenLastCalledWith(expect.objectContaining({ to: admin.username, text: expect.stringContaining(String(tokens[0]!.token)) }));
    });
    it("changes a password once, removes its reset token and rejects weak/invalid input", async () => {
        const confirm = (await import("../server/api/auth/reset-password/confirm.post")).default;
        await expect(confirm(h.event)).rejects.toMatchObject({ statusCode: 400 });
        h.input.body = { token: "valid", password: "123" };
        await expect(confirm(h.event)).rejects.toMatchObject({ statusCode: 400 });
        db.prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (1, 'valid', ?)").run(new Date(Date.now() + 86400000).toISOString());
        h.input.body = { token: "valid", password: strong + "NEW" };
        expect(await confirm(h.event)).toEqual({ success: true });
        const row = db.prepare("SELECT password_hash FROM users WHERE id = 1").get()!;
        expect(bcrypt.compareSync(strong + "NEW", String(row.password_hash))).toBe(true);
        await expect(confirm(h.event)).rejects.toMatchObject({ statusCode: 400 });
    });
    it("rejects an ISO reset token that expired earlier today", async () => {
        const confirm = (await import("../server/api/auth/reset-password/confirm.post")).default;
        db.exec("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (1, 'expired', strftime('%Y-%m-%dT00:00:00.000Z', 'now'))");
        h.input.body = { token: "expired", password: strong };
        await expect(confirm(h.event)).rejects.toMatchObject({ statusCode: 400 });
    });
    it("revokes one or all user refresh tokens without affecting another user's session", async () => {
        const tokens = await import("../server/utils/tokenUtils");
        const first = tokens.generateRefreshToken(1);
        const second = tokens.generateRefreshToken(1);
        const other = tokens.generateRefreshToken(2);
        tokens.revokeRefreshToken(first);
        expect(() => tokens.verifyRefreshToken(first)).toThrow();
        expect(tokens.verifyRefreshToken(second).id).toBe(1);
        tokens.revokeAllUserRefreshTokens(1);
        expect(() => tokens.verifyRefreshToken(second)).toThrow();
        expect(tokens.verifyRefreshToken(other).id).toBe(2);
    });
});

import { describe, expect, it } from "vitest";

import {
  ALL_ROLES,
  requireAdmin,
  SESSION_TTL_MS,
  signSession,
  verifyCredentials,
  verifySession,
} from "./admin-session";

const env = {
  ADMIN_SESSION_SECRET: "test-secret-that-is-long-enough-1234567890",
  SUPERADMIN_PASSWORD: "super-pass",
  ADMIN_PASSWORD: "owner-pass",
  ANALYST_PASSWORD: "analyst-pass",
};

describe("verifyCredentials", () => {
  it('disables legacy superadmin password after transfer to Google', async () => {
    expect(await verifyCredentials('superadmin', 'super-pass', env)).toBeNull();
  });
  it("accepts the right password for each configured account", async () => {
    expect(await verifyCredentials(" Connexts ", "owner-pass", env)).toEqual({
      user: "connexts",
      role: "owner",
    });
    expect(await verifyCredentials("analyst", "analyst-pass", env)).toEqual({
      user: "analyst",
      role: "analyst",
    });
  });

  it("rejects wrong passwords and another account's password", async () => {
    expect(await verifyCredentials("connexts", "wrong", env)).toBeNull();
    expect(await verifyCredentials("connexts", "super-pass", env)).toBeNull();
  });

  it("disables accounts whose password env is missing or empty", async () => {
    expect(await verifyCredentials("viewer", "", env)).toBeNull();
    expect(await verifyCredentials("viewer", "anything", env)).toBeNull();
    expect(await verifyCredentials("connexts", "", {})).toBeNull();
  });
});

describe("signSession / verifySession", () => {
  it('rejects legacy superadmin sessions', async () => {
    const { token } = await signSession({ user: 'superadmin', role: 'superadmin' }, env);
    expect(await verifySession(token, env)).toBeNull();
  });
  it('round-trips the Google superadmin identity', async () => {
    const session = { user: 'srichausiripong@gmail.com', role: 'superadmin' as const, userId: 'verified-user', method: 'google' as const };
    const { token } = await signSession(session, env);
    expect(await verifySession(token, env)).toMatchObject(session);
  });
  it("round-trips a signed session", async () => {
    const { token, exp } = await signSession({ user: "connexts", role: "owner" }, env, 1_000);
    expect(exp).toBe(1_000 + SESSION_TTL_MS);
    expect(await verifySession(token, env, 2_000)).toEqual({
      user: "connexts",
      role: "owner",
      exp,
    });
  });

  it("rejects expired tokens", async () => {
    const { token, exp } = await signSession({ user: "connexts", role: "owner" }, env, 1_000);
    expect(await verifySession(token, env, exp)).toBeNull();
  });

  it("rejects tampered payloads and signatures", async () => {
    const { token } = await signSession({ user: "viewer", role: "viewer" }, env);
    const [body, sig] = token.split(".");
    const forged = btoa(
      JSON.stringify({ user: "viewer", role: "superadmin", exp: Date.now() + 60_000 }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifySession(`${forged}.${sig}`, env)).toBeNull();
    expect(await verifySession(`${body}.${sig}x`, env)).toBeNull();
    expect(await verifySession(`${body}`, env)).toBeNull();
    expect(await verifySession(123, env)).toBeNull();
  });

  it("rejects tokens signed with a different secret", async () => {
    const { token } = await signSession({ user: "connexts", role: "owner" }, env);
    const other = { ...env, ADMIN_SESSION_SECRET: "another-secret-that-is-long-enough-0987654321" };
    expect(await verifySession(token, other)).toBeNull();
  });

  it("refuses to sign without a long enough secret", async () => {
    await expect(signSession({ user: "connexts", role: "owner" }, {})).rejects.toThrow(
      "ADMIN_SESSION_SECRET",
    );
    await expect(
      signSession({ user: "connexts", role: "owner" }, { ADMIN_SESSION_SECRET: "short" }),
    ).rejects.toThrow("ADMIN_SESSION_SECRET");
  });
});

describe("requireAdmin", () => {
  it("allows write roles by default and blocks read-only roles", async () => {
    const owner = await signSession({ user: "connexts", role: "owner" }, env);
    const viewer = await signSession({ user: "viewer", role: "viewer" }, env);
    await expect(requireAdmin(owner.token, undefined, env)).resolves.toMatchObject({
      role: "owner",
    });
    await expect(requireAdmin(viewer.token, undefined, env)).rejects.toThrow("forbidden");
    await expect(requireAdmin(viewer.token, ALL_ROLES, env)).resolves.toMatchObject({
      role: "viewer",
    });
  });

  it("rejects missing or invalid tokens", async () => {
    await expect(requireAdmin("", ALL_ROLES, env)).rejects.toThrow("unauthorized");
    await expect(requireAdmin("plain-password", ALL_ROLES, env)).rejects.toThrow("unauthorized");
  });
});

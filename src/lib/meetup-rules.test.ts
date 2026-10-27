import { describe, expect, it } from "vitest";
import {
  PING_GAP_MS,
  MEETUP_TTL_MS,
  POLL_MS,
  acceptedForInviter,
  canInvite,
  canTransition,
  incomingPending,
  isActive,
  tryPing,
  type Meetup,
  type MeetupStatus,
} from "./meetup-rules";

const T0 = Date.parse("2026-10-27T10:00:00.000Z");

function meetup(over: Partial<Meetup> = {}): Meetup {
  return {
    id: "m1",
    connectionId: "c1",
    inviter: "alice",
    invitee: "bob",
    status: "pending",
    signalKey: "sig",
    createdAt: new Date(T0).toISOString(),
    respondedAt: null,
    expiresAt: new Date(T0 + MEETUP_TTL_MS).toISOString(),
    ...over,
  };
}

const NOW = T0 + 60_000;

describe("constants", () => {
  it("uses the spec values", () => {
    expect(MEETUP_TTL_MS).toBe(30 * 60_000);
    expect(POLL_MS).toBe(20_000);
    expect(PING_GAP_MS).toBe(2_000);
  });
});

describe("isActive", () => {
  it("is true for pending and accepted before expiry", () => {
    expect(isActive(meetup({ status: "pending" }), NOW)).toBe(true);
    expect(isActive(meetup({ status: "accepted" }), NOW)).toBe(true);
  });
  it("is false for declined, done and cancelled", () => {
    for (const status of ["declined", "done", "cancelled"] as MeetupStatus[]) {
      expect(isActive(meetup({ status }), NOW)).toBe(false);
    }
  });
  it("is false at and after expiry", () => {
    const m = meetup();
    const exp = Date.parse(m.expiresAt);
    expect(isActive(m, exp - 1)).toBe(true);
    expect(isActive(m, exp)).toBe(false);
    expect(isActive(meetup({ status: "accepted" }), exp + 1)).toBe(false);
  });
});

describe("canTransition", () => {
  const ok = { ok: true };
  it("pending -> accepted | declined by the invitee only", () => {
    const m = meetup();
    expect(canTransition(m, "bob", "accepted", NOW)).toEqual(ok);
    expect(canTransition(m, "bob", "declined", NOW)).toEqual(ok);
    expect(canTransition(m, "alice", "accepted", NOW)).toEqual({
      ok: false,
      reason: "not-allowed",
    });
    expect(canTransition(m, "alice", "declined", NOW)).toEqual({
      ok: false,
      reason: "not-allowed",
    });
    expect(canTransition(m, "zed", "accepted", NOW)).toEqual({ ok: false, reason: "not-allowed" });
  });
  it("pending -> cancelled by the inviter only", () => {
    const m = meetup();
    expect(canTransition(m, "alice", "cancelled", NOW)).toEqual(ok);
    expect(canTransition(m, "bob", "cancelled", NOW)).toEqual({ ok: false, reason: "not-allowed" });
  });
  it("pending cannot go straight to done", () => {
    const m = meetup();
    expect(canTransition(m, "alice", "done", NOW)).toEqual({ ok: false, reason: "not-allowed" });
    expect(canTransition(m, "bob", "done", NOW)).toEqual({ ok: false, reason: "not-allowed" });
  });
  it("accepted -> done | cancelled by either participant, not by outsiders", () => {
    const m = meetup({ status: "accepted" });
    for (const actor of ["alice", "bob"]) {
      expect(canTransition(m, actor, "done", NOW)).toEqual(ok);
      expect(canTransition(m, actor, "cancelled", NOW)).toEqual(ok);
    }
    expect(canTransition(m, "zed", "done", NOW)).toEqual({ ok: false, reason: "not-allowed" });
    expect(canTransition(m, "zed", "cancelled", NOW)).toEqual({ ok: false, reason: "not-allowed" });
  });
  it("accepted cannot go back to pending/accepted/declined", () => {
    const m = meetup({ status: "accepted" });
    for (const to of ["pending", "accepted", "declined"] as MeetupStatus[]) {
      expect(canTransition(m, "bob", to, NOW)).toEqual({ ok: false, reason: "not-allowed" });
    }
  });
  it("terminal statuses allow nothing", () => {
    for (const status of ["declined", "done", "cancelled"] as MeetupStatus[]) {
      const m = meetup({ status });
      expect(canTransition(m, "bob", "accepted", NOW)).toEqual({
        ok: false,
        reason: "not-allowed",
      });
      expect(canTransition(m, "alice", "cancelled", NOW)).toEqual({
        ok: false,
        reason: "not-allowed",
      });
    }
  });
  it("any transition at or after expiry is expired", () => {
    const exp = T0 + MEETUP_TTL_MS;
    expect(canTransition(meetup(), "bob", "accepted", exp)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(canTransition(meetup(), "bob", "accepted", exp + 5_000)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(canTransition(meetup({ status: "accepted" }), "alice", "done", exp)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(canTransition(meetup(), "bob", "accepted", exp - 1)).toEqual(ok);
  });
});

describe("canInvite", () => {
  it("is false when an active meetup exists for the connection", () => {
    expect(canInvite([meetup()], "c1", NOW, "alice")).toBe(false);
    expect(canInvite([meetup({ status: "accepted" })], "c1", NOW, "alice")).toBe(false);
    expect(canInvite([meetup()], "c1", NOW, "bob")).toBe(false);
  });
  it("is true with no meetups, or only expired/done ones, or the partner's declined/cancelled ones", () => {
    expect(canInvite([], "c1", NOW, "alice")).toBe(true);
    const exp = T0 + MEETUP_TTL_MS;
    expect(canInvite([meetup()], "c1", exp, "alice")).toBe(true);
    expect(canInvite([meetup({ status: "done" })], "c1", NOW, "alice")).toBe(true);
    // alice เป็นผู้ชวนแถวที่ถูกปฏิเสธ/ยกเลิก → bob ยังชวนได้
    expect(
      canInvite(
        [meetup({ status: "declined" }), meetup({ status: "cancelled" })],
        "c1",
        NOW,
        "bob",
      ),
    ).toBe(true);
  });
  it("cool-down: my own declined or cancelled invite blocks me until it would have expired", () => {
    const exp = T0 + MEETUP_TTL_MS;
    for (const status of ["declined", "cancelled"] as const) {
      expect(canInvite([meetup({ status })], "c1", NOW, "alice")).toBe(false);
      expect(canInvite([meetup({ status })], "c1", exp - 1, "alice")).toBe(false);
      expect(canInvite([meetup({ status })], "c1", exp, "alice")).toBe(true);
    }
  });
  it("ignores active meetups on other connections", () => {
    expect(canInvite([meetup({ connectionId: "c2" })], "c1", NOW, "alice")).toBe(true);
    expect(
      canInvite([meetup({ connectionId: "c2", status: "declined" })], "c1", NOW, "alice"),
    ).toBe(true);
  });
});

describe("incomingPending", () => {
  it("returns only active pending meetups for the invitee, oldest first", () => {
    const newer = meetup({
      id: "new",
      createdAt: new Date(T0 + 10_000).toISOString(),
      expiresAt: new Date(T0 + 10_000 + MEETUP_TTL_MS).toISOString(),
    });
    const older = meetup({ id: "old" });
    const accepted = meetup({ id: "acc", status: "accepted" });
    const other = meetup({ id: "other", invitee: "carol" });
    const mine = meetup({ id: "mine", inviter: "bob", invitee: "alice" });
    const expired = meetup({
      id: "exp",
      createdAt: new Date(T0 - 2 * MEETUP_TTL_MS).toISOString(),
      expiresAt: new Date(T0 - MEETUP_TTL_MS).toISOString(),
    });
    const list = [newer, accepted, other, mine, expired, older];
    expect(incomingPending(list, "bob", NOW).map((m) => m.id)).toEqual(["old", "new"]);
    expect(list.map((m) => m.id)).toEqual(["new", "acc", "other", "mine", "exp", "old"]);
  });
});

describe("acceptedForInviter", () => {
  it("returns active accepted meetups I invited that I have not seen", () => {
    const a = meetup({ id: "a", status: "accepted" });
    const b = meetup({ id: "b", status: "accepted" });
    const pending = meetup({ id: "p" });
    const notMine = meetup({ id: "n", status: "accepted", inviter: "carol" });
    const expired = meetup({
      id: "e",
      status: "accepted",
      expiresAt: new Date(T0 + 1_000).toISOString(),
    });
    const list = [a, b, pending, notMine, expired];
    expect(acceptedForInviter(list, "alice", NOW, new Set()).map((m) => m.id)).toEqual(["a", "b"]);
    expect(acceptedForInviter(list, "alice", NOW, new Set(["a"])).map((m) => m.id)).toEqual(["b"]);
  });
});

describe("tryPing", () => {
  it("allows the first ping and enforces the 2 s gap", () => {
    const t = 100_000;
    expect(tryPing(null, t)).toBe(true);
    expect(tryPing(t, t + 1999)).toBe(false);
    expect(tryPing(t, t + 2000)).toBe(true);
  });
});

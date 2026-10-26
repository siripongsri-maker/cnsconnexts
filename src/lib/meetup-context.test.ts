import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Meetup } from "./meetup-rules";
import {
  KNOCK_GAP_MS,
  SEEN_ACCEPTED_LIMIT,
  connectAndInvite,
  createReloadRunner,
  initialMeetupState,
  meetupReducer,
  otherInConnection,
  parseSeenAccepted,
  partnerName,
  resolveMeId,
  selectAcceptedForMe,
  selectFindSession,
  selectIncoming,
  type MeetupState,
} from "./meetup-state";
import type { Connection } from "./types";

const NOW = Date.parse("2026-10-27T10:00:00Z");
const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function meetup(over: Partial<Meetup> = {}): Meetup {
  return {
    id: "m1",
    connectionId: "c1",
    inviter: OTHER,
    invitee: ME,
    status: "pending",
    signalKey: "k1",
    createdAt: new Date(NOW - 60_000).toISOString(),
    respondedAt: null,
    expiresAt: new Date(NOW + 29 * 60_000).toISOString(),
    ...over,
  };
}

function withMeetups(meetups: Meetup[], over: Partial<MeetupState> = {}): MeetupState {
  return { ...initialMeetupState(), meetups, ...over };
}

describe("resolveMeId", () => {
  it("dev + meetsim + as → overrides the store id", () => {
    expect(resolveMeId(ME, "?meetsim&as=a1", true)).toBe("a1");
  });
  it("dev + meetsim + as works without a store profile", () => {
    expect(resolveMeId(null, "?meetsim&pair=a1,b2&as=b2", true)).toBe("b2");
  });
  it("production ignores ?as", () => {
    expect(resolveMeId(ME, "?meetsim&as=a1", false)).toBe(ME);
  });
  it("without ?as returns the store id", () => {
    expect(resolveMeId(ME, "?meetsim", true)).toBe(ME);
    expect(resolveMeId(null, "?meetsim", true)).toBeNull();
  });
  it("?as without ?meetsim is ignored", () => {
    expect(resolveMeId(ME, "?as=a1", true)).toBe(ME);
  });
  it("blank ?as falls back to the store id", () => {
    expect(resolveMeId(ME, "?meetsim&as=%20", true)).toBe(ME);
  });
});

describe("meetupReducer: loaded / upserted", () => {
  it("loaded merges by id, keeping rows not in the list", () => {
    const s0 = withMeetups([meetup({ id: "a" }), meetup({ id: "b" })]);
    const s1 = meetupReducer(s0, {
      type: "loaded",
      meetups: [meetup({ id: "b", status: "accepted" }), meetup({ id: "c" })],
    });
    expect(s1.meetups.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
    expect(s1.meetups.find((m) => m.id === "b")?.status).toBe("accepted");
  });

  it("loaded with replace drops everything else (identity change)", () => {
    const s0 = withMeetups([meetup({ id: "a" })]);
    const s1 = meetupReducer(s0, { type: "loaded", meetups: [], replace: true });
    expect(s1.meetups).toEqual([]);
  });

  it("upserted inserts a new row and replaces an existing one by id", () => {
    const s0 = withMeetups([meetup({ id: "a" })]);
    const s1 = meetupReducer(s0, { type: "upserted", meetup: meetup({ id: "b" }) });
    expect(s1.meetups.map((m) => m.id).sort()).toEqual(["a", "b"]);
    const s2 = meetupReducer(s1, {
      type: "upserted",
      meetup: meetup({ id: "a", status: "declined" }),
    });
    expect(s2.meetups).toHaveLength(2);
    expect(s2.meetups.find((m) => m.id === "a")?.status).toBe("declined");
  });

  it("a stale list never moves a row backwards (accepted stays accepted)", () => {
    const s0 = withMeetups([meetup({ id: "a", status: "accepted" })]);
    const s1 = meetupReducer(s0, { type: "loaded", meetups: [meetup({ id: "a" })] });
    expect(s1.meetups[0]?.status).toBe("accepted");
    const s2 = meetupReducer(s1, {
      type: "loaded",
      meetups: [meetup({ id: "a", status: "done" })],
    });
    expect(s2.meetups[0]?.status).toBe("done");
  });
});

describe("meetupReducer: find mode", () => {
  it("openFind only opens an active accepted meetup", () => {
    const accepted = meetup({ id: "acc", status: "accepted" });
    const pending = meetup({ id: "pen" });
    const expired = meetup({
      id: "old",
      status: "accepted",
      expiresAt: new Date(NOW - 1).toISOString(),
    });
    const s0 = withMeetups([accepted, pending, expired]);
    expect(meetupReducer(s0, { type: "openFind", id: "acc", now: NOW }).findId).toBe("acc");
    expect(meetupReducer(s0, { type: "openFind", id: "pen", now: NOW }).findId).toBeNull();
    expect(meetupReducer(s0, { type: "openFind", id: "old", now: NOW }).findId).toBeNull();
    expect(meetupReducer(s0, { type: "openFind", id: "nope", now: NOW }).findId).toBeNull();
  });

  it("closeFind clears the session", () => {
    const s0 = withMeetups([meetup({ id: "acc", status: "accepted" })], { findId: "acc" });
    const s1 = meetupReducer(s0, { type: "closeFind" });
    expect(s1.findId).toBeNull();
    expect(selectFindSession(s1)).toBeNull();
  });

  it("selectFindSession returns the open meetup", () => {
    const acc = meetup({ id: "acc", status: "accepted" });
    const s0 = meetupReducer(withMeetups([acc]), { type: "openFind", id: "acc", now: NOW });
    expect(selectFindSession(s0)).toEqual(acc);
  });

  it("the session closes when the partner finishes or cancels", () => {
    const s0 = withMeetups([meetup({ id: "acc", status: "accepted" })], { findId: "acc" });
    const done = meetupReducer(s0, {
      type: "loaded",
      meetups: [meetup({ id: "acc", status: "done" })],
    });
    expect(done.findId).toBeNull();
    const cancelled = meetupReducer(s0, {
      type: "upserted",
      meetup: meetup({ id: "acc", status: "cancelled" }),
    });
    expect(cancelled.findId).toBeNull();
  });
});

describe("meetupReducer: seen accepted", () => {
  const mine = meetup({ id: "acc", inviter: ME, invitee: OTHER, status: "accepted" });

  it("seenAccepted removes the meetup from acceptedForMe", () => {
    const s0 = withMeetups([mine]);
    expect(selectAcceptedForMe(s0, ME, NOW).map((m) => m.id)).toEqual(["acc"]);
    const s1 = meetupReducer(s0, { type: "seenAccepted", id: "acc" });
    expect(s1.seenAccepted).toContain("acc");
    expect(selectAcceptedForMe(s1, ME, NOW)).toEqual([]);
  });

  it("seenAccepted is idempotent and capped", () => {
    let s = initialMeetupState();
    s = meetupReducer(s, { type: "seenAccepted", id: "x" });
    s = meetupReducer(s, { type: "seenAccepted", id: "x" });
    expect(s.seenAccepted).toEqual(["x"]);
    for (let i = 0; i < SEEN_ACCEPTED_LIMIT + 5; i++) {
      s = meetupReducer(s, { type: "seenAccepted", id: `id${i}` });
    }
    expect(s.seenAccepted).toHaveLength(SEEN_ACCEPTED_LIMIT);
    expect(s.seenAccepted.at(-1)).toBe(`id${SEEN_ACCEPTED_LIMIT + 4}`);
  });

  it("initial state takes persisted seen ids; parseSeenAccepted tolerates junk", () => {
    expect(initialMeetupState(["a"]).seenAccepted).toEqual(["a"]);
    expect(parseSeenAccepted(null)).toEqual([]);
    expect(parseSeenAccepted("not json")).toEqual([]);
    expect(parseSeenAccepted('{"a":1}')).toEqual([]);
    expect(parseSeenAccepted('["a", 2, "b"]')).toEqual(["a", "b"]);
  });

  it("selectIncoming lists pending invites to me", () => {
    const s0 = withMeetups([meetup({ id: "in" }), mine]);
    expect(selectIncoming(s0, ME, NOW).map((m) => m.id)).toEqual(["in"]);
    expect(selectIncoming(s0, null, NOW)).toEqual([]);
    expect(selectAcceptedForMe(s0, null, NOW)).toEqual([]);
  });
});

describe("otherInConnection / partnerName", () => {
  const conn = (a: string, b: string) => ({ id: "c", user_a: a, user_b: b });

  it("resolves the partner of a store connection that uses 'me'", () => {
    expect(otherInConnection(conn("me", OTHER), ME)).toBe(OTHER);
    expect(otherInConnection(conn(OTHER, "me"), ME)).toBe(OTHER);
  });
  it("resolves the partner of a connection with real ids (meetsim pair)", () => {
    expect(otherInConnection(conn("a1", "b2"), "a1")).toBe("b2");
    expect(otherInConnection(conn("a1", "b2"), "b2")).toBe("a1");
    expect(otherInConnection(conn("a1", "b2"), "zz")).toBeNull();
  });
  it("partner name: store name first, meetsim fallback, otherwise generic", () => {
    expect(partnerName("Nok", "abcdef", false)).toBe("Nok");
    expect(partnerName(undefined, "b2c3d4", true)).toBe("ผู้ทดสอบ b2c3");
    expect(partnerName(undefined, "b2c3d4", false)).toBe("เพื่อนใหม่");
  });
});

describe("createReloadRunner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function deferredRun() {
    const resolvers: Array<() => void> = [];
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const finish = async () => {
      resolvers.shift()?.();
      await vi.advanceTimersByTimeAsync(0);
    };
    return { run, finish };
  }

  it("a burst of knocks runs once now and once trailing, at most once per gap", async () => {
    const { run, finish } = deferredRun();
    const r = createReloadRunner({ run, gapMs: KNOCK_GAP_MS });
    r.knock();
    expect(run).toHaveBeenCalledTimes(1);
    await finish();
    for (let i = 0; i < 20; i++) r.knock();
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(KNOCK_GAP_MS - 1);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2);
    await finish();
    await vi.advanceTimersByTimeAsync(KNOCK_GAP_MS * 3);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("never more than one in flight; a request during flight queues one more", async () => {
    const { run, finish } = deferredRun();
    const r = createReloadRunner({ run, gapMs: KNOCK_GAP_MS });
    r.now();
    r.now();
    r.knock();
    r.now();
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(KNOCK_GAP_MS * 2);
    expect(run).toHaveBeenCalledTimes(1);
    await finish();
    expect(run).toHaveBeenCalledTimes(2);
    await finish();
    await vi.advanceTimersByTimeAsync(KNOCK_GAP_MS * 3);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("a failing run does not wedge the runner", async () => {
    const run = vi.fn(() => Promise.reject(new Error("offline")));
    const r = createReloadRunner({ run, gapMs: KNOCK_GAP_MS });
    r.now();
    await vi.advanceTimersByTimeAsync(0);
    r.now();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("dispose cancels the trailing run and ignores later calls", async () => {
    const { run, finish } = deferredRun();
    const r = createReloadRunner({ run, gapMs: KNOCK_GAP_MS });
    r.knock();
    await finish();
    r.knock();
    r.dispose();
    r.now();
    await vi.advanceTimersByTimeAsync(KNOCK_GAP_MS * 2);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("connectAndInvite", () => {
  const connection: Connection = {
    id: "c9",
    user_a: "me",
    user_b: OTHER,
    match_score: 80,
    match_reason: "r",
    status: "Connected",
    created_at: new Date(NOW).toISOString(),
  };

  it("a new connection fires an invite without awaiting it", async () => {
    const connect = vi.fn(async () => ({ ok: true as const, connection, existed: false }));
    let resolveInvite: (v: "sent") => void = () => {};
    const invite = vi.fn(
      () =>
        new Promise<"sent">((r) => {
          resolveInvite = r;
        }),
    );
    const result = await connectAndInvite({ dryrun: false, connect, invite }, OTHER, 80, "r");
    expect(result).toEqual({ ok: true, connection, existed: false });
    expect(connect).toHaveBeenCalledWith(OTHER, 80, "r");
    expect(invite).toHaveBeenCalledWith(connection);
    resolveInvite("sent");
  });

  it("an existing connection or a failed connect sends no invite", async () => {
    const invite = vi.fn(async () => "sent" as const);
    await connectAndInvite(
      { dryrun: false, connect: async () => ({ ok: true, connection, existed: true }), invite },
      OTHER,
      80,
      "r",
    );
    await connectAndInvite(
      { dryrun: false, connect: async () => ({ ok: false }), invite },
      OTHER,
      80,
      "r",
    );
    expect(invite).not.toHaveBeenCalled();
  });

  it("dry-run never connects nor invites", async () => {
    const connect = vi.fn(async () => ({ ok: true as const, connection, existed: false }));
    const invite = vi.fn(async () => "sent" as const);
    const result = await connectAndInvite({ dryrun: true, connect, invite }, OTHER, 80, "r");
    expect(result).toEqual({ ok: false });
    expect(connect).not.toHaveBeenCalled();
    expect(invite).not.toHaveBeenCalled();
  });

  it("reports an invite failure (also a thrown one) without failing the connect", async () => {
    const onInviteFailed = vi.fn();
    const ok = await connectAndInvite(
      {
        dryrun: false,
        connect: async () => ({ ok: true, connection, existed: false }),
        invite: async () => "failed" as const,
        onInviteFailed,
      },
      OTHER,
      80,
      "r",
    );
    expect(ok.ok).toBe(true);
    await connectAndInvite(
      {
        dryrun: false,
        connect: async () => ({ ok: true, connection, existed: false }),
        invite: () => Promise.reject(new Error("boom")),
        onInviteFailed,
      },
      OTHER,
      80,
      "r",
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(onInviteFailed).toHaveBeenCalledTimes(2);
  });
});

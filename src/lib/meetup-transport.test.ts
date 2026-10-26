import { describe, expect, it, vi } from "vitest";

import {
  channelStateFromStatus,
  classifyDbError,
  createSupabaseTransport,
  rowToMeetup,
  type MeetupRow,
} from "./meetup-transport";

const ROW: MeetupRow = {
  id: "m1",
  connection_id: "c1",
  inviter: "11111111-1111-4111-8111-111111111111",
  invitee: "22222222-2222-4222-8222-222222222222",
  status: "pending",
  signal_key: "sig-1",
  created_at: "2026-10-27T10:00:00+00:00",
  responded_at: null,
  expires_at: "2026-10-27T10:30:00+00:00",
};

type Result = { data: unknown; error: { code?: string; message?: string } | null };

/** ตัวปลอมของ db.from(...) — ทุกคำสั่งที่ await จะได้ผลลัพธ์ถัดไปในคิว และบันทึกว่าเรียกอะไรไป */
function fakeDb(results: Result[]) {
  const calls: string[][] = [];
  const db = {
    from(table: string) {
      const call = [`from:${table}`];
      calls.push(call);
      const next = () => Promise.resolve(results.shift() ?? { data: null, error: null });
      const builder: Record<string, unknown> = {};
      for (const name of ["select", "insert", "update", "eq", "or", "order", "limit", "in"]) {
        builder[name] = (...args: unknown[]) => {
          call.push(`${name}:${JSON.stringify(args)}`);
          return builder;
        };
      }
      builder["single"] = () => (call.push("single"), next());
      builder["maybeSingle"] = () => (call.push("maybeSingle"), next());
      builder["then"] = (ok: (v: Result) => unknown, bad: (e: unknown) => unknown) =>
        next().then(ok, bad);
      return builder;
    },
  };
  return { db, calls };
}

function transport(results: Result[]) {
  const { db, calls } = fakeDb(results);
  const t = createSupabaseTransport({ db: db as never, realtime: {} as never });
  return { t, calls };
}

describe("rowToMeetup", () => {
  it("maps snake_case rows to camelCase meetups", () => {
    expect(rowToMeetup(ROW)).toEqual({
      id: "m1",
      connectionId: "c1",
      inviter: ROW.inviter,
      invitee: ROW.invitee,
      status: "pending",
      signalKey: "sig-1",
      createdAt: ROW.created_at,
      respondedAt: null,
      expiresAt: ROW.expires_at,
    });
  });

  it("drops rows with an unknown status", () => {
    expect(rowToMeetup({ ...ROW, status: "weird" })).toBeNull();
  });
});

describe("classifyDbError", () => {
  it("maps trigger tokens, RLS and transport failures", () => {
    expect(classifyDbError({ code: "22023", message: "meetup_expired" })).toBe("expired");
    expect(classifyDbError({ code: "42501", message: "meetup_transition_not_allowed" })).toBe(
      "not-allowed",
    );
    expect(classifyDbError({ code: "42501", message: "meetup_immutable_column" })).toBe(
      "not-allowed",
    );
    expect(
      classifyDbError({ code: "42501", message: "new row violates row-level security policy" }),
    ).toBe("not-allowed");
    expect(classifyDbError({ code: "", message: "TypeError: Failed to fetch" })).toBe("network");
    expect(classifyDbError({ message: "fetch failed" })).toBe("network");
  });
});

describe("channelStateFromStatus", () => {
  it("maps Supabase subscribe statuses", () => {
    expect(channelStateFromStatus("SUBSCRIBED")).toBe("open");
    expect(channelStateFromStatus("CHANNEL_ERROR")).toBe("lost");
    expect(channelStateFromStatus("TIMED_OUT")).toBe("lost");
    expect(channelStateFromStatus("CLOSED")).toBe("lost");
    expect(channelStateFromStatus("something-else")).toBeNull();
  });
});

describe("supabase transport — create", () => {
  const input = { connectionId: "c1", inviter: ROW.inviter, invitee: ROW.invitee };

  it("inserts only the pair and reads back the server-filled row", async () => {
    const { t, calls } = transport([{ data: ROW, error: null }]);
    const res = await t.create(input);
    expect(res).toEqual({ ok: true, existing: false, meetup: rowToMeetup(ROW) });
    expect(calls[0]).toContain(
      `insert:${JSON.stringify([{ connection_id: "c1", inviter: ROW.inviter, invitee: ROW.invitee }])}`,
    );
    expect(calls[0]).toContain("single");
  });

  it("a unique violation returns the active meetup on that connection as existing", async () => {
    const other = { ...ROW, id: "m0", connection_id: "c9" };
    const active = { ...ROW, id: "m2", inviter: ROW.invitee, invitee: ROW.inviter };
    const done = { ...ROW, id: "m3", status: "done" };
    const { t } = transport([
      { data: null, error: { code: "23505", message: "duplicate key value" } },
      { data: [other, done, active], error: null },
    ]);
    const res = await t.create(input);
    expect(res).toEqual({ ok: true, existing: true, meetup: rowToMeetup(active) });
  });

  it("any other failure is ok: false", async () => {
    const { t } = transport([
      { data: null, error: { code: "23514", message: "meetup_not_connection_pair" } },
    ]);
    expect(await t.create(input)).toEqual({ ok: false });
  });
});

describe("supabase transport — setStatus", () => {
  it("returns the updated row", async () => {
    const accepted = { ...ROW, status: "accepted", responded_at: "2026-10-27T10:01:00+00:00" };
    const { t, calls } = transport([{ data: accepted, error: null }]);
    expect(await t.setStatus("m1", "accepted")).toEqual({
      ok: true,
      meetup: rowToMeetup(accepted),
    });
    expect(calls[0]).toContain(`update:${JSON.stringify([{ status: "accepted" }])}`);
  });

  it("maps an expiry from the trigger", async () => {
    const { t } = transport([
      { data: null, error: { code: "22023", message: "meetup_expired" } },
      { data: ROW, error: null },
    ]);
    expect(await t.setStatus("m1", "accepted")).toEqual({ ok: false, reason: "expired" });
  });

  it("treats a lost race to the same status (done → done) as success", async () => {
    const done = { ...ROW, status: "done" };
    const { t } = transport([
      { data: null, error: { code: "42501", message: "meetup_transition_not_allowed" } },
      { data: done, error: null },
    ]);
    expect(await t.setStatus("m1", "done")).toEqual({ ok: true, meetup: rowToMeetup(done) });
  });

  it("an illegal transition stays not-allowed", async () => {
    const { t } = transport([
      { data: null, error: { code: "42501", message: "meetup_transition_not_allowed" } },
      { data: ROW, error: null },
    ]);
    expect(await t.setStatus("m1", "done")).toEqual({ ok: false, reason: "not-allowed" });
  });

  it("an invisible row (0 rows under RLS) is not-allowed", async () => {
    const { t } = transport([
      { data: null, error: null },
      { data: null, error: null },
    ]);
    expect(await t.setStatus("m1", "accepted")).toEqual({ ok: false, reason: "not-allowed" });
  });

  it("a failed request is network", async () => {
    const { t } = transport([{ data: null, error: { code: "", message: "Failed to fetch" } }]);
    expect(await t.setStatus("m1", "accepted")).toEqual({ ok: false, reason: "network" });
  });
});

describe("supabase transport — list", () => {
  it("filters to my meetups and maps rows", async () => {
    const { t, calls } = transport([{ data: [ROW, { ...ROW, status: "bad" }], error: null }]);
    expect(await t.list(ROW.inviter)).toEqual([rowToMeetup(ROW)]);
    expect(calls[0]).toContain(
      `or:${JSON.stringify([`inviter.eq.${ROW.inviter},invitee.eq.${ROW.inviter}`])}`,
    );
  });

  it("never builds a filter from a non-uuid id", async () => {
    const { t, calls } = transport([]);
    expect(await t.list("x),status.eq.done")).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("throws on a failed request so callers keep what they have", async () => {
    const { t } = transport([{ data: null, error: { code: "", message: "Failed to fetch" } }]);
    await expect(t.list(ROW.inviter)).rejects.toThrow();
  });
});

/** ตัวปลอมของ supabase realtime — จำช่อง, ตัวฟัง และสิ่งที่ส่ง */
function fakeRealtime(opts: { httpFails?: boolean } = {}) {
  type Ch = {
    topic: string;
    params: unknown;
    handlers: Map<string, (msg: { payload: unknown }) => void>;
    status?: (s: string) => void;
    sent: unknown[];
    httpSent: unknown[];
  };
  const made: Ch[] = [];
  const removed: Ch[] = [];
  const realtime = {
    channel(topic: string, params: unknown) {
      const ch: Ch = { topic, params, handlers: new Map(), sent: [], httpSent: [] };
      made.push(ch);
      const api = {
        on(_type: string, filter: { event: string }, cb: (msg: { payload: unknown }) => void) {
          ch.handlers.set(filter.event, cb);
          return api;
        },
        subscribe(cb: (s: string) => void) {
          ch.status = cb;
          return api;
        },
        async send(args: unknown) {
          ch.sent.push(args);
          return "ok";
        },
        async httpSend(event: string, payload: unknown) {
          if (opts.httpFails) throw new Error("nope");
          ch.httpSent.push({ event, payload });
          return { success: true };
        },
        _ch: ch,
      };
      return api;
    },
    async removeChannel(api: { _ch: Ch }) {
      removed.push(api._ch);
      return "ok";
    },
    getChannels: () => [],
  };
  const t = createSupabaseTransport({ db: {} as never, realtime: realtime as never });
  return { t, made, removed };
}

describe("supabase transport — realtime", () => {
  it("knock sends a contentless broadcast to the target inbox over REST", async () => {
    const { t, made, removed } = fakeRealtime();
    await t.knock("p2");
    expect(made).toHaveLength(1);
    expect(made[0]?.topic).toBe("inbox:p2");
    expect(made[0]?.params).toEqual({ config: { broadcast: { self: false } } });
    expect(made[0]?.httpSent).toEqual([{ event: "knock", payload: { type: "knock" } }]);
    expect(removed).toEqual([made[0]]);
  });

  it("knock never throws", async () => {
    const { t } = fakeRealtime({ httpFails: true });
    await expect(t.knock("p2")).resolves.toBeUndefined();
  });

  it("onKnock listens on my inbox", () => {
    const { t, made } = fakeRealtime();
    const cb = vi.fn();
    t.onKnock("p1", cb);
    expect(made[0]?.topic).toBe("inbox:p1");
    made[0]?.handlers.get("knock")?.({ payload: { type: "knock" } });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("joinSignal maps channel states, filters my own pings and sends ping payloads", async () => {
    const { t, made } = fakeRealtime();
    const onPing = vi.fn();
    const onState = vi.fn();
    const s = t.joinSignal("key", "me", onPing, onState);
    const ch = made[0]!;
    expect(ch.topic).toBe("meet:key");
    expect(onState).toHaveBeenLastCalledWith("connecting");
    ch.status?.("SUBSCRIBED");
    expect(onState).toHaveBeenLastCalledWith("open");
    ch.status?.("CHANNEL_ERROR");
    expect(onState).toHaveBeenLastCalledWith("lost");

    ch.handlers.get("ping")?.({ payload: { type: "ping", from: "me" } });
    ch.handlers.get("ping")?.({ payload: { type: "ping", from: "you" } });
    expect(onPing.mock.calls).toEqual([["you"]]);

    await s.ping();
    expect(ch.sent).toEqual([
      { type: "broadcast", event: "ping", payload: { type: "ping", from: "me" } },
    ]);

    s.leave();
    ch.status?.("CLOSED");
    expect(onState).toHaveBeenLastCalledWith("lost");
    expect(onState).toHaveBeenCalledTimes(3);
  });

  it("re-joining right after leaving (StrictMode) reuses the channel; it closes after a pause", () => {
    vi.useFakeTimers();
    try {
      const { t, made, removed } = fakeRealtime();
      const first = t.joinSignal(
        "key",
        "me",
        () => {},
        () => {},
      );
      first.leave();
      const onState = vi.fn();
      const second = t.joinSignal("key", "me", () => {}, onState);
      expect(made).toHaveLength(1);
      made[0]?.status?.("SUBSCRIBED");
      expect(onState).toHaveBeenLastCalledWith("open");
      second.leave();
      expect(removed).toHaveLength(0);
      vi.advanceTimersByTime(5_000);
      expect(removed).toEqual([made[0]]);
    } finally {
      vi.useRealTimers();
    }
  });
});

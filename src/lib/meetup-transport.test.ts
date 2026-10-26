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

/**
 * ตัวปลอมของ supabase realtime ที่ทำตัวเหมือนของจริงในจุดที่สำคัญ:
 * channel(ชื่อเดิม) คืนช่องเดิมที่ยังอยู่ในรายการ, subscribe ซ้ำไม่ทำอะไร,
 * removeChannel ล้มได้ (ช่องค้างในรายการ), เซิร์ฟเวอร์ปิดช่องได้ (CLOSED)
 */
function fakeRealtime(
  opts: { httpFails?: boolean; removeFails?: number; subscribeThrows?: number } = {},
) {
  type Ch = {
    topic: string;
    params: unknown;
    handlers: Map<string, (msg: { payload: unknown }) => void>;
    status?: (s: string) => void;
    subscribed: boolean;
    sent: unknown[];
    httpSent: unknown[];
  };
  type Api = { topic: string; _ch: Ch; subscribe(cb: (s: string) => void): unknown };
  const made: Ch[] = [];
  const removed: Ch[] = [];
  let live: Api[] = [];
  let removeFails = opts.removeFails ?? 0;
  let subscribeThrows = opts.subscribeThrows ?? 0;
  const drop = (ch: Ch) => void (live = live.filter((a) => a._ch !== ch));

  function channel(topic: string, params?: unknown) {
    const existing = live.find((a) => a._ch.topic === topic);
    if (existing) return existing;
    const ch: Ch = {
      topic,
      params,
      handlers: new Map(),
      subscribed: false,
      sent: [],
      httpSent: [],
    };
    made.push(ch);
    const api = {
      topic: `realtime:${topic}`,
      _ch: ch,
      on(_type: string, filter: { event: string }, cb: (msg: { payload: unknown }) => void) {
        ch.handlers.set(filter.event, cb);
        return api;
      },
      subscribe(cb: (s: string) => void) {
        if (subscribeThrows > 0) {
          subscribeThrows--;
          throw new Error("tried to join multiple times");
        }
        if (ch.subscribed) return api; // เหมือนของจริง: ช่องที่ยังไม่ปิด subscribe ซ้ำแล้วเงียบ
        ch.subscribed = true;
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
    };
    live.push(api);
    return api;
  }

  const realtime = {
    channel,
    async removeChannel(api: Api) {
      removed.push(api._ch);
      if (removeFails > 0) {
        removeFails--;
        return "error";
      }
      drop(api._ch);
      api._ch.status?.("CLOSED");
      return "ok";
    },
    getChannels: () => [...live],
  };
  const t = createSupabaseTransport({ db: {} as never, realtime: realtime as never });
  return {
    t,
    made,
    removed,
    /** เซิร์ฟเวอร์ปิดช่องเอง */
    serverClose(ch: Ch) {
      drop(ch);
      ch.status?.("CLOSED");
    },
    /** ช่องค้างจากการถอดที่ไม่สำเร็จ (ยัง join อยู่) */
    leftover(topic: string) {
      const api = channel(topic);
      api.subscribe(() => {});
      return api._ch;
    },
  };
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

  it("a server-closed channel is replaced: lost → connecting → open, queued ping is sent", async () => {
    vi.useFakeTimers();
    try {
      const { t, made, serverClose } = fakeRealtime();
      const onPing = vi.fn();
      const onState = vi.fn();
      const s = t.joinSignal("key", "me", onPing, onState);
      made[0]!.status?.("SUBSCRIBED");
      serverClose(made[0]!);
      expect(onState).toHaveBeenLastCalledWith("lost");

      await s.ping(); // ไม่มีช่องอยู่ → เก็บไว้ส่งเมื่อต่อได้
      await vi.advanceTimersByTimeAsync(5_000);
      expect(made).toHaveLength(2);
      expect(made[1]!.topic).toBe("meet:key");
      expect(onState).toHaveBeenLastCalledWith("connecting");
      expect(made[1]!.sent).toEqual([
        { type: "broadcast", event: "ping", payload: { type: "ping", from: "me" } },
      ]);
      made[1]!.status?.("SUBSCRIBED");
      expect(onState.mock.calls.map((c) => c[0])).toEqual([
        "connecting",
        "open",
        "lost",
        "connecting",
        "open",
      ]);

      made[0]!.handlers.get("ping")?.({ payload: { type: "ping", from: "old" } });
      made[1]!.handlers.get("ping")?.({ payload: { type: "ping", from: "you" } });
      expect(onPing.mock.calls).toEqual([["you"]]);

      await s.ping();
      expect(made[1]!.sent).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a channel closed by the server while lingering is not reused by the next join", () => {
    vi.useFakeTimers();
    try {
      const { t, made, serverClose } = fakeRealtime();
      t.joinSignal(
        "key",
        "me",
        () => {},
        () => {},
      ).leave();
      serverClose(made[0]!);
      const onState = vi.fn();
      t.joinSignal("key", "me", () => {}, onState);
      expect(made).toHaveLength(2);
      made[1]!.status?.("SUBSCRIBED");
      expect(onState).toHaveBeenLastCalledWith("open");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a leftover joined channel with the same topic is removed before a fresh subscribe", async () => {
    vi.useFakeTimers();
    try {
      const { t, made, removed, leftover } = fakeRealtime({ removeFails: 1 });
      const stale = leftover("meet:key");
      const onState = vi.fn();
      const s = t.joinSignal("key", "me", () => {}, onState);
      await s.ping();
      expect(stale.sent).toEqual([]); // ไม่ส่งผ่านช่องค้าง
      await vi.advanceTimersByTimeAsync(10_000);
      expect(removed.filter((c) => c === stale)).toHaveLength(2); // ครั้งแรกถอดไม่สำเร็จ → ลองใหม่
      const fresh = made.at(-1)!;
      expect(fresh).not.toBe(stale);
      expect(fresh.sent).toHaveLength(1);
      fresh.status?.("SUBSCRIBED");
      expect(onState).toHaveBeenLastCalledWith("open");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a throwing subscribe reports lost and retries instead of leaving pings dead", async () => {
    vi.useFakeTimers();
    try {
      const { t, made, removed } = fakeRealtime({ subscribeThrows: 1 });
      const onState = vi.fn();
      const s = t.joinSignal("key", "me", () => {}, onState);
      expect(onState).toHaveBeenLastCalledWith("lost");
      await vi.advanceTimersByTimeAsync(10_000);
      const broken = made[0]!;
      expect(removed).toContain(broken);
      const fresh = made.at(-1)!;
      expect(fresh).not.toBe(broken);
      fresh.status?.("SUBSCRIBED");
      expect(onState).toHaveBeenLastCalledWith("open");
      await s.ping();
      expect(fresh.sent).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("getMeetupTransport", () => {
  it("stays on the local transport after a navigation drops ?meetsim", async () => {
    vi.resetModules();
    const store = new Map<string, string>();
    const location = { search: "?meetsim&pair=a1,b2" };
    vi.stubGlobal("window", { location });
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    try {
      const mod = await import("./meetup-transport");
      const local = mod.getMeetupTransport();
      location.search = ""; // ลิงก์ภายในพาไปหน้าที่ไม่มี ?meetsim
      const later = mod.getMeetupTransport();
      expect(later).toBe(local);
      // ยังเป็นตัวจำลอง: สร้างคำชวนบนคอนเนกชันจำลองได้โดยไม่แตะเครือข่าย
      const res = await later.create({
        connectionId: "meetsim-a1-b2",
        inviter: "a1",
        invitee: "b2",
      });
      expect(res.ok).toBe(true);
      expect(store.get("meetsim:meetups")).toContain("meetsim-a1-b2");
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it("without ?meetsim it picks a different (Supabase) transport", async () => {
    vi.resetModules();
    const location = { search: "" };
    vi.stubGlobal("window", { location });
    try {
      const mod = await import("./meetup-transport");
      const prod = mod.getMeetupTransport();
      expect(mod.getMeetupTransport()).toBe(prod);
      location.search = "?meetsim";
      expect(mod.getMeetupTransport()).not.toBe(prod);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});

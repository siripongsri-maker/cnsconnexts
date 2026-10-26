import { describe, expect, it, vi } from "vitest";

import { MEETUP_TTL_MS } from "./meetup-rules";
import {
  createLocalTransport,
  meetsimPairFromSearch,
  seedConnection,
  type ChannelLike,
  type StorageLike,
} from "./meetup-transport-local";

const T0 = Date.parse("2026-10-27T10:00:00.000Z");

function fakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

/** ทำตัวเหมือน BroadcastChannel จริง: ส่งถึงทุกช่องชื่อเดียวกัน ยกเว้นตัวที่ส่งเอง และส่งแบบ async */
function fakeBus() {
  const all = new Set<{ name: string; listeners: Set<(e: { data: unknown }) => void> }>();
  return (name: string): ChannelLike => {
    const self = { name, listeners: new Set<(e: { data: unknown }) => void>() };
    all.add(self);
    return {
      postMessage(data: unknown) {
        const copy = JSON.parse(JSON.stringify(data)) as unknown;
        for (const other of all) {
          if (other === self || other.name !== name) continue;
          for (const l of other.listeners) queueMicrotask(() => l({ data: copy }));
        }
      },
      addEventListener: (_type, l) => void self.listeners.add(l),
      removeEventListener: (_type, l) => void self.listeners.delete(l),
      close: () => void all.delete(self),
    };
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** สองแท็บ (alice / bob) ใช้ storage และ BroadcastChannel ร่วมกัน + ผู้ใช้คนที่สาม carol */
function setup() {
  let now = T0;
  const clock = () => now;
  const storage = fakeStorage();
  const channelFactory = fakeBus();
  seedConnection("c1", "alice", "bob", storage);
  seedConnection("c2", "alice", "carol", storage);
  const make = (who: string) =>
    createLocalTransport({ now: clock, storage, channelFactory, actor: () => who });
  return {
    alice: make("alice"),
    bob: make("bob"),
    carol: make("carol"),
    storage,
    channelFactory,
    clock,
    advance: (ms: number) => void (now += ms),
  };
}

describe("local meetup transport — create / list", () => {
  it("creates a pending meetup that both sides see", async () => {
    const { alice, bob, carol } = setup();
    const res = await alice.create({ connectionId: "c1", inviter: "alice", invitee: "bob" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.existing).toBe(false);
    expect(res.meetup).toMatchObject({
      connectionId: "c1",
      inviter: "alice",
      invitee: "bob",
      status: "pending",
      respondedAt: null,
      createdAt: new Date(T0).toISOString(),
      expiresAt: new Date(T0 + MEETUP_TTL_MS).toISOString(),
    });
    expect(res.meetup.signalKey).toMatch(/.{8,}/);

    expect((await alice.list("alice")).map((m) => m.id)).toEqual([res.meetup.id]);
    expect((await bob.list("bob")).map((m) => m.id)).toEqual([res.meetup.id]);
    expect(await carol.list("carol")).toEqual([]);
  });

  it("persists rows so a new tab on the same storage sees them", async () => {
    const { alice, storage, channelFactory, clock } = setup();
    const res = await alice.create({ connectionId: "c1", inviter: "alice", invitee: "bob" });
    const later = createLocalTransport({ now: clock, storage, channelFactory });
    expect((await later.list("bob")).map((m) => m.id)).toEqual(res.ok ? [res.meetup.id] : []);
  });

  it("rejects people who are not the connection pair, like the DB trigger", async () => {
    const { alice } = setup();
    expect(await alice.create({ connectionId: "c1", inviter: "alice", invitee: "carol" })).toEqual({
      ok: false,
    });
    expect(await alice.create({ connectionId: "nope", inviter: "alice", invitee: "bob" })).toEqual({
      ok: false,
    });
    expect(await alice.create({ connectionId: "c1", inviter: "alice", invitee: "alice" })).toEqual({
      ok: false,
    });
  });

  it("rejects inviting on someone else's behalf (RLS is_my_participant(inviter))", async () => {
    const { alice } = setup();
    expect(await alice.create({ connectionId: "c1", inviter: "bob", invitee: "alice" })).toEqual({
      ok: false,
    });
  });

  it("returns the existing active meetup on a duplicate create (both press at once)", async () => {
    const { alice, bob } = setup();
    const first = await alice.create({ connectionId: "c1", inviter: "alice", invitee: "bob" });
    const second = await bob.create({ connectionId: "c1", inviter: "bob", invitee: "alice" });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.existing).toBe(true);
    expect(second.meetup.id).toBe(first.meetup.id);
    expect(await bob.list("bob")).toHaveLength(1);
  });

  it("an expired active meetup no longer blocks a new one and becomes cancelled", async () => {
    const { alice, advance } = setup();
    const first = await alice.create({ connectionId: "c1", inviter: "alice", invitee: "bob" });
    advance(MEETUP_TTL_MS);
    const second = await alice.create({ connectionId: "c1", inviter: "alice", invitee: "bob" });
    expect(second.ok && !second.existing).toBe(true);
    const rows = await alice.list("alice");
    expect(rows).toHaveLength(2);
    expect(rows.find((m) => first.ok && m.id === first.meetup.id)?.status).toBe("cancelled");
  });

  it("learns the actor from list(meId) when no actor is injected", async () => {
    const { storage, channelFactory, clock } = setup();
    const tab = createLocalTransport({ now: clock, storage, channelFactory });
    await tab.list("alice");
    const res = await tab.create({ connectionId: "c1", inviter: "alice", invitee: "bob" });
    expect(res.ok).toBe(true);
  });
});

describe("local meetup transport — setStatus", () => {
  async function pending() {
    const s = setup();
    const res = await s.alice.create({ connectionId: "c1", inviter: "alice", invitee: "bob" });
    if (!res.ok) throw new Error("create failed");
    return { ...s, id: res.meetup.id };
  }

  it("only the invitee may accept or decline", async () => {
    const { alice, bob, id, advance } = await pending();
    expect(await alice.setStatus(id, "accepted")).toEqual({ ok: false, reason: "not-allowed" });
    advance(1000);
    const res = await bob.setStatus(id, "accepted");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.meetup.status).toBe("accepted");
    expect(res.meetup.respondedAt).toBe(new Date(T0 + 1000).toISOString());
    expect((await alice.list("alice"))[0]?.status).toBe("accepted");
  });

  it("only the inviter may cancel a pending meetup", async () => {
    const { alice, bob, id } = await pending();
    expect(await bob.setStatus(id, "cancelled")).toEqual({ ok: false, reason: "not-allowed" });
    const res = await alice.setStatus(id, "cancelled");
    expect(res.ok && res.meetup.status).toBe("cancelled");
    expect(res.ok && res.meetup.respondedAt).toBe(null);
  });

  it("either side may finish an accepted meetup; a repeated finish is ok", async () => {
    const { alice, bob, id } = await pending();
    await bob.setStatus(id, "accepted");
    expect((await alice.setStatus(id, "done")).ok).toBe(true);
    const again = await bob.setStatus(id, "done");
    expect(again.ok && again.meetup.status).toBe("done");
    expect(await bob.setStatus(id, "cancelled")).toEqual({ ok: false, reason: "not-allowed" });
  });

  it("rejects every change once expired", async () => {
    const { bob, id, advance } = await pending();
    advance(MEETUP_TTL_MS);
    expect(await bob.setStatus(id, "accepted")).toEqual({ ok: false, reason: "expired" });
  });

  it("outsiders and unknown ids are not allowed", async () => {
    const { carol, bob, id } = await pending();
    expect(await carol.setStatus(id, "declined")).toEqual({ ok: false, reason: "not-allowed" });
    expect(await bob.setStatus("missing", "accepted")).toEqual({
      ok: false,
      reason: "not-allowed",
    });
  });
});

describe("local meetup transport — knock / ping", () => {
  it("a knock reaches only the target participant's onKnock", async () => {
    const { alice, bob, carol } = setup();
    const onBob = vi.fn();
    const onCarol = vi.fn();
    const onAlice = vi.fn();
    const offBob = bob.onKnock("bob", onBob);
    carol.onKnock("carol", onCarol);
    alice.onKnock("alice", onAlice);

    await alice.knock("bob");
    await flush();
    expect(onBob).toHaveBeenCalledTimes(1);
    expect(onCarol).not.toHaveBeenCalled();
    expect(onAlice).not.toHaveBeenCalled();

    offBob();
    await alice.knock("bob");
    await flush();
    expect(onBob).toHaveBeenCalledTimes(1);
  });

  it("a ping reaches the other side of the same signal key only", async () => {
    const { alice, bob, carol } = setup();
    const aPing = vi.fn();
    const bPing = vi.fn();
    const cPing = vi.fn();
    const aState = vi.fn();
    const a = alice.joinSignal("key-1", "alice", aPing, aState);
    const b = bob.joinSignal("key-1", "bob", bPing, () => {});
    carol.joinSignal("key-2", "carol", cPing, () => {});
    await flush();
    expect(aState).toHaveBeenLastCalledWith("open");

    await a.ping();
    await flush();
    expect(bPing).toHaveBeenCalledWith("alice");
    expect(aPing).not.toHaveBeenCalled();
    expect(cPing).not.toHaveBeenCalled();

    await b.ping();
    await flush();
    expect(aPing).toHaveBeenCalledWith("bob");

    b.leave();
    await a.ping();
    await flush();
    expect(bPing).toHaveBeenCalledTimes(1);
  });

  it("the wire payloads carry no profile data", async () => {
    const { alice, channelFactory } = setup();
    const seen: unknown[] = [];
    const spy = channelFactory("meetsim");
    spy.addEventListener("message", (e) => seen.push(e.data));
    await alice.knock("bob");
    const a = alice.joinSignal(
      "key-1",
      "alice",
      () => {},
      () => {},
    );
    await a.ping();
    await flush();
    expect(seen).toEqual([
      { topic: "inbox:bob", event: "knock", payload: { type: "knock" } },
      { topic: "meet:key-1", event: "ping", payload: { type: "ping", from: "alice" } },
    ]);
  });
});

describe("meetsimPairFromSearch", () => {
  it("reads ?pair=<a>,<b> into a deterministic, order-independent connection", () => {
    expect(meetsimPairFromSearch("?meetsim&pair=a1,b2&as=a1")).toEqual({
      connectionId: "meetsim-a1-b2",
      a: "a1",
      b: "b2",
    });
    expect(meetsimPairFromSearch("?meetsim&pair=b2,a1")?.connectionId).toBe("meetsim-a1-b2");
  });

  it("ignores missing or malformed pairs", () => {
    expect(meetsimPairFromSearch("?meetsim")).toBeNull();
    expect(meetsimPairFromSearch("?pair=a1")).toBeNull();
    expect(meetsimPairFromSearch("?pair=a1,a1")).toBeNull();
  });
});

/**
 * ตัวจำลองการส่งคำชวนเจอ "ในเครื่อง" สำหรับ dev เท่านั้น (`?meetsim`)
 * — เก็บแถวใน localStorage และส่งกริ่ง/สัญญาณผ่าน BroadcastChannel ระหว่างแท็บ
 * จึงทดสอบได้ครบทั้งเส้นทางด้วยสองแท็บ โดยไม่แตะฐานข้อมูลจริงเลย
 *
 * ใช้กติกาเดียวกับ trigger ในฐานข้อมูล: คู่ต้องตรงกับคอนเนกชัน, 1 คำชวนที่ active ต่อคอนเนกชัน,
 * คำชวนหมดอายุถูกยกเลิกก่อนสร้างใหม่, เปลี่ยนสถานะตาม `canTransition`
 */
import { MEETUP_TTL_MS, canTransition, type Meetup, type MeetupStatus } from "./meetup-rules";
import type { ChannelState, MeetupTransport } from "./meetup-transport";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

type MessageListener = (e: { data: unknown }) => void;
export type ChannelLike = {
  postMessage(data: unknown): void;
  addEventListener(type: "message", listener: MessageListener): void;
  removeEventListener(type: "message", listener: MessageListener): void;
  close(): void;
};

export type LocalTransportOptions = {
  now?: () => number;
  storage?: StorageLike;
  channelFactory?: (name: string) => ChannelLike;
  /**
   * ใครเป็นคนกดในแท็บนี้ (แทน x-device-id ของของจริง) — ถ้าไม่ให้มา ใช้ meId ล่าสุด
   * ที่ส่งเข้า list / onKnock / joinSignal
   */
  actor?: () => string | null;
};

const MEETUPS_KEY = "meetsim:meetups";
const CONNECTIONS_KEY = "meetsim:connections";
const CLOCK_OFFSET_KEY = "meetsim:clock-offset-ms";
const CHANNEL_NAME = "meetsim";

type Wire = { topic: string; event: "knock" | "ping"; payload: unknown };
type Pair = { a: string; b: string };

function readJson<T>(storage: StorageLike, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function defaultStorage(): StorageLike {
  return globalThis.localStorage;
}

/** จำลองแถวใน `connections` ระหว่างสองคน — `create` ตรวจคู่กับข้อมูลนี้เหมือน trigger */
export function seedConnection(
  connectionId: string,
  a: string,
  b: string,
  storage: StorageLike = defaultStorage(),
): void {
  const all = readJson<Record<string, Pair>>(storage, CONNECTIONS_KEY, {});
  all[connectionId] = { a, b };
  storage.setItem(CONNECTIONS_KEY, JSON.stringify(all));
}

/** `?pair=<idA>,<idB>` → คอนเนกชันจำลองที่รหัสคงที่ (ไม่ขึ้นกับลำดับ) */
export function meetsimPairFromSearch(
  search: string,
): { connectionId: string; a: string; b: string } | null {
  const raw = new URLSearchParams(search).get("pair");
  const ids = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length !== 2 || ids[0] === ids[1]) return null;
  const [a, b] = [...ids].sort() as [string, string];
  return { connectionId: `meetsim-${a}-${b}`, a, b };
}

/**
 * เลื่อนนาฬิกาจำลองของทุกแท็บ (ใช้ทดสอบการหมดอายุโดยไม่ต้องแก้โค้ด)
 * มีผลเฉพาะ transport ที่สร้างโดยไม่ได้ส่ง `now` เข้ามา
 */
export function advanceMeetsimClock(ms: number, storage: StorageLike = defaultStorage()): void {
  const offset = Number(storage.getItem(CLOCK_OFFSET_KEY)) || 0;
  storage.setItem(CLOCK_OFFSET_KEY, String(offset + ms));
}

function randomId(): string {
  return globalThis.crypto.randomUUID();
}

export function createLocalTransport(opts: LocalTransportOptions = {}): MeetupTransport {
  const storage = opts.storage ?? defaultStorage();
  const now = opts.now ?? (() => Date.now() + (Number(storage.getItem(CLOCK_OFFSET_KEY)) || 0));
  const makeChannel =
    opts.channelFactory ?? ((name: string) => new BroadcastChannel(name) as ChannelLike);
  let lastMeId: string | null = null;
  const actor = opts.actor ?? (() => lastMeId);
  const remember = (meId: string) => {
    lastMeId = meId;
  };

  let channel: ChannelLike | null = null;
  const bus = () => (channel ??= makeChannel(CHANNEL_NAME));
  const post = (msg: Wire) => bus().postMessage(msg);
  const listen = (fn: (msg: Wire) => void): (() => void) => {
    const listener: MessageListener = (e) => {
      const msg = e.data as Partial<Wire> | null;
      if (msg && typeof msg.topic === "string" && typeof msg.event === "string") fn(msg as Wire);
    };
    bus().addEventListener("message", listener);
    return () => bus().removeEventListener("message", listener);
  };

  const load = () => readJson<Meetup[]>(storage, MEETUPS_KEY, []);
  const save = (rows: Meetup[]) => storage.setItem(MEETUPS_KEY, JSON.stringify(rows));
  const connections = () => readJson<Record<string, Pair>>(storage, CONNECTIONS_KEY, {});

  return {
    async list(meId) {
      remember(meId);
      // ใหม่สุดก่อน เหมือนของจริง
      return load()
        .filter((m) => m.inviter === meId || m.invitee === meId)
        .sort((x, y) => Date.parse(y.createdAt) - Date.parse(x.createdAt));
    },

    async create({ connectionId, inviter, invitee }) {
      const pair = connections()[connectionId];
      const samePair =
        !!pair &&
        inviter !== invitee &&
        ((pair.a === inviter && pair.b === invitee) || (pair.a === invitee && pair.b === inviter));
      if (!samePair) return { ok: false };
      // RLS: ชวนได้ในนามตัวเองเท่านั้น
      const who = actor();
      if (who !== null && who !== inviter) return { ok: false };

      const t = now();
      // trigger: คำชวนที่หมดอายุแล้วไม่บล็อกคำชวนใหม่
      const rows = load().map((m) =>
        m.connectionId === connectionId &&
        (m.status === "pending" || m.status === "accepted") &&
        Date.parse(m.expiresAt) <= t
          ? { ...m, status: "cancelled" as const }
          : m,
      );
      const live = rows.find(
        (m) =>
          m.connectionId === connectionId && (m.status === "pending" || m.status === "accepted"),
      );
      if (live) {
        save(rows);
        return { ok: true, meetup: live, existing: true };
      }
      const meetup: Meetup = {
        id: randomId(),
        connectionId,
        inviter,
        invitee,
        status: "pending",
        signalKey: randomId(),
        createdAt: new Date(t).toISOString(),
        respondedAt: null,
        expiresAt: new Date(t + MEETUP_TTL_MS).toISOString(),
      };
      save([...rows, meetup]);
      return { ok: true, meetup, existing: false };
    },

    async setStatus(id, to: MeetupStatus) {
      const rows = load();
      const index = rows.findIndex((m) => m.id === id);
      const current = rows[index];
      const who = actor();
      // RLS: แถวที่ไม่ใช่ของคู่เรามองไม่เห็นเลย
      if (!current || who === null || (who !== current.inviter && who !== current.invitee)) {
        return { ok: false, reason: "not-allowed" };
      }
      // อีกฝ่ายเปลี่ยนเป็นสถานะเดียวกันไปก่อนแล้ว (เช่นกด "เจอกันแล้ว" พร้อมกัน) → ถือว่าสำเร็จ
      if (current.status === to) return { ok: true, meetup: current };
      const t = now();
      const verdict = canTransition(current, who, to, t);
      if (!verdict.ok) return { ok: false, reason: verdict.reason };
      const respondedAt =
        to === "accepted" || to === "declined" ? new Date(t).toISOString() : current.respondedAt;
      const next: Meetup = { ...current, status: to, respondedAt };
      rows[index] = next;
      save(rows);
      return { ok: true, meetup: next };
    },

    async knock(participantId) {
      post({ topic: `inbox:${participantId}`, event: "knock", payload: { type: "knock" } });
    },

    onKnock(meId, cb) {
      remember(meId);
      const topic = `inbox:${meId}`;
      return listen((msg) => {
        if (msg.topic === topic && msg.event === "knock") cb();
      });
    },

    joinSignal(signalKey, meId, onPing, onState: (s: ChannelState) => void) {
      remember(meId);
      const topic = `meet:${signalKey}`;
      let left = false;
      const stop = listen((msg) => {
        if (left || msg.topic !== topic || msg.event !== "ping") return;
        const from = (msg.payload as { from?: unknown } | null)?.from;
        if (typeof from === "string" && from !== meId) onPing(from);
      });
      onState("connecting");
      queueMicrotask(() => {
        if (!left) onState("open");
      });
      return {
        async ping() {
          if (left) return;
          post({ topic, event: "ping", payload: { type: "ping", from: meId } });
        },
        leave() {
          left = true;
          stop();
        },
      };
    },
  };
}

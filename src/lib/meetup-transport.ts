/**
 * ทางเดียวที่คำชวนเจอและสัญญาณหากันวิ่งผ่าน (spec §3)
 * - ของจริง: ตาราง `meetups` ผ่าน `db` (แนบ x-device-id ให้ RLS) + Supabase Realtime Broadcast
 *   ช่อง `inbox:<participantId>` (กริ่ง `{ type: "knock" }`) และ `meet:<signal_key>`
 *   (`{ type: "ping", from }`) — ไม่ส่งชื่อ ตำแหน่ง หรือข้อมูลโปรไฟล์ใดๆ
 * - dev: `?meetsim` ใช้ตัวจำลองในเครื่อง (meetup-transport-local.ts) — production ไม่มีทางเลือกเส้นนี้
 */
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { db } from "./db";
import type { Meetup, MeetupStatus } from "./meetup-rules";
import {
  createLocalTransport,
  meetsimPairFromSearch,
  seedConnection,
} from "./meetup-transport-local";

export type ChannelState = "connecting" | "open" | "lost";

export interface MeetupTransport {
  /** คำชวนที่ฉันเป็นผู้ชวนหรือผู้ถูกชวน — โยน error ถ้าเน็ตล่ม (ผู้เรียกเก็บของเดิมไว้) */
  list(meId: string): Promise<Meetup[]>;
  create(input: {
    connectionId: string;
    inviter: string;
    invitee: string;
  }): Promise<{ ok: true; meetup: Meetup; existing: boolean } | { ok: false }>;
  setStatus(
    id: string,
    to: MeetupStatus,
  ): Promise<
    { ok: true; meetup: Meetup } | { ok: false; reason: "expired" | "not-allowed" | "network" }
  >;
  /** กริ่งเปล่าไปยังอีกฝ่าย — ทำเต็มที่แต่ไม่รับประกัน (มีการดึงทุก 20 วินาทีสำรอง) ไม่โยน error */
  knock(participantId: string): Promise<void>;
  onKnock(meId: string, cb: () => void): () => void;
  joinSignal(
    signalKey: string,
    meId: string,
    onPing: (from: string) => void,
    onState: (s: ChannelState) => void,
  ): { ping(): Promise<void>; leave(): void };
}

export type MeetupRow = Database["public"]["Tables"]["meetups"]["Row"];

const STATUSES: readonly MeetupStatus[] = ["pending", "accepted", "declined", "done", "cancelled"];
const COLUMNS =
  "id, connection_id, inviter, invitee, status, signal_key, created_at, responded_at, expires_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStatus(s: string): s is MeetupStatus {
  return (STATUSES as readonly string[]).includes(s);
}

/** แปลงแถวในฐานข้อมูล (snake_case) เป็น `Meetup` — สถานะที่ไม่รู้จักคืน null */
export function rowToMeetup(row: MeetupRow): Meetup | null {
  if (!isStatus(row.status)) return null;
  return {
    id: row.id,
    connectionId: row.connection_id,
    inviter: row.inviter,
    invitee: row.invitee,
    status: row.status,
    signalKey: row.signal_key,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    expiresAt: row.expires_at,
  };
}

function rowsToMeetups(rows: readonly MeetupRow[] | null): Meetup[] {
  return (rows ?? []).map(rowToMeetup).filter((m): m is Meetup => m !== null);
}

/**
 * error จาก PostgREST → เหตุผลที่ UI ใช้
 * - `meetup_expired` (trigger) → expired
 * - error ที่มี SQLSTATE (trigger ปฏิเสธ / RLS 42501 / อื่นๆ จากฐานข้อมูล) → not-allowed
 * - ไม่มีรหัส (fetch ล้ม, หมดเวลา) → network
 */
export function classifyDbError(error: {
  code?: string;
  message?: string;
}): "expired" | "not-allowed" | "network" {
  const message = error.message ?? "";
  if (message.includes("meetup_expired")) return "expired";
  if (
    message.includes("meetup_transition_not_allowed") ||
    message.includes("meetup_immutable_column")
  ) {
    return "not-allowed";
  }
  return error.code ? "not-allowed" : "network";
}

/** สถานะช่อง Realtime → สถานะที่โหมดหากันแสดง */
export function channelStateFromStatus(status: string): ChannelState | null {
  if (status === "SUBSCRIBED") return "open";
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") return "lost";
  return null;
}

type DbClient = typeof db;
type RealtimeClient = Pick<typeof supabase, "channel" | "removeChannel" | "getChannels">;

/** เก็บช่องไว้ครู่หนึ่งหลังผู้ฟังคนสุดท้ายออก — React StrictMode ถอด/ต่อ effect ทันที */
const LINGER_MS = 1_500;

type Sub = { onMessage: (payload: unknown) => void; onState?: (s: ChannelState) => void };
type Hub = {
  channel: RealtimeChannel | null;
  state: ChannelState;
  subs: Set<Sub>;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

export function createSupabaseTransport(deps: {
  db: DbClient;
  realtime: RealtimeClient;
}): MeetupTransport {
  const { db: client, realtime } = deps;
  const hubs = new Map<string, Hub>();
  /** ช่องที่กำลังปิด — supabase.channel(ชื่อเดิม) จะคืนช่องเก่าที่กำลังปิด จึงต้องรอให้ปิดเสร็จก่อน */
  const closing = new Map<string, Promise<void>>();

  function startHub(topic: string, event: string, hub: Hub) {
    if (hubs.get(topic) !== hub) return; // ถูกปิดไปก่อนได้เริ่ม
    const channel = realtime.channel(topic, { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event }, (msg: { payload?: unknown }) => {
      for (const sub of hub.subs) sub.onMessage(msg.payload);
    });
    channel.subscribe((status: string) => {
      const state = channelStateFromStatus(status);
      if (!state || hubs.get(topic) !== hub) return;
      hub.state = state;
      for (const sub of hub.subs) sub.onState?.(state);
    });
    hub.channel = channel;
  }

  function closeHub(topic: string, hub: Hub) {
    if (hubs.get(topic) !== hub) return;
    hubs.delete(topic);
    const channel = hub.channel;
    if (!channel) return;
    const done: Promise<void> = realtime
      .removeChannel(channel)
      .then(
        () => undefined,
        () => undefined,
      )
      .finally(() => {
        if (closing.get(topic) === done) closing.delete(topic);
      });
    closing.set(topic, done);
  }

  function acquire(topic: string, event: string, sub: Sub) {
    let hub = hubs.get(topic);
    if (!hub) {
      const fresh: Hub = { channel: null, state: "connecting", subs: new Set(), closeTimer: null };
      hubs.set(topic, fresh);
      const pending = closing.get(topic);
      if (pending) void pending.then(() => startHub(topic, event, fresh));
      else startHub(topic, event, fresh);
      hub = fresh;
    }
    if (hub.closeTimer) {
      clearTimeout(hub.closeTimer);
      hub.closeTimer = null;
    }
    hub.subs.add(sub);
    sub.onState?.(hub.state);
    const owned = hub;
    return {
      hub: owned,
      release() {
        if (!owned.subs.delete(sub) || owned.subs.size > 0) return;
        owned.closeTimer = setTimeout(() => closeHub(topic, owned), LINGER_MS);
      },
    };
  }

  async function list(meId: string): Promise<Meetup[]> {
    // ป้องกันการแทรกตัวกรองของ PostgREST ผ่านรหัส
    if (!UUID.test(meId)) return [];
    const { data, error } = await client
      .from("meetups")
      .select(COLUMNS)
      .or(`inviter.eq.${meId},invitee.eq.${meId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`[meetups] list failed: ${error.message}`);
    return rowsToMeetups(data);
  }

  return {
    list,

    async create({ connectionId, inviter, invitee }) {
      // trigger เป็นคนกำหนด signal_key / เวลา / status เอง → อ่านแถวที่บันทึกจริงกลับมาเสมอ
      const { data, error } = await client
        .from("meetups")
        .insert({ connection_id: connectionId, inviter, invitee })
        .select(COLUMNS)
        .single();
      if (!error && data) {
        const meetup = rowToMeetup(data);
        return meetup ? { ok: true, meetup, existing: false } : { ok: false };
      }
      // 23505 = มีคำชวนที่ active บนคอนเนกชันนี้อยู่แล้ว (เช่นทั้งคู่กดพร้อมกัน) → ส่งอันนั้นกลับไป
      if (error?.code === "23505") {
        try {
          const live = (await list(inviter)).find(
            (m) =>
              m.connectionId === connectionId &&
              (m.status === "pending" || m.status === "accepted"),
          );
          if (live) return { ok: true, meetup: live, existing: true };
        } catch {
          // ตกไปที่ ok: false
        }
      }
      return { ok: false };
    },

    async setStatus(id, to) {
      const { data, error } = await client
        .from("meetups")
        .update({ status: to })
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle();
      if (!error && data) {
        const meetup = rowToMeetup(data);
        if (meetup) return { ok: true, meetup };
      }
      // ไม่มีแถวกลับมาเลย = RLS มองไม่เห็นแถวนี้
      const reason = error ? classifyDbError(error) : "not-allowed";
      if (reason === "network") return { ok: false, reason };
      // trigger ปฏิเสธการเปลี่ยนเป็นสถานะเดิม (สองคนกด "เจอกันแล้ว" พร้อมกัน) → ถ้าแถวอยู่ที่สถานะนั้นแล้ว ถือว่าสำเร็จ
      const reread = await client.from("meetups").select(COLUMNS).eq("id", id).maybeSingle();
      if (!reread.error && reread.data && reread.data.status === to) {
        const meetup = rowToMeetup(reread.data);
        if (meetup) return { ok: true, meetup };
      }
      return { ok: false, reason };
    },

    async knock(participantId) {
      const topic = `inbox:${participantId}`;
      const payload = { type: "knock" };
      try {
        const joined = hubs.get(topic)?.channel;
        if (joined) {
          await joined.send({ type: "broadcast", event: "knock", payload });
          return;
        }
        // ส่งทาง REST โดยไม่ต้อง subscribe แล้วทิ้งช่องทันที
        const channel = realtime.channel(topic, { config: { broadcast: { self: false } } });
        try {
          await channel.httpSend("knock", payload);
        } finally {
          void realtime.removeChannel(channel);
        }
      } catch {
        // กริ่งไม่ดังก็ไม่เป็นไร — อีกฝ่ายจะเห็นจากการดึงรอบถัดไป
      }
    },

    onKnock(meId, cb) {
      const { release } = acquire(`inbox:${meId}`, "knock", { onMessage: () => cb() });
      return release;
    },

    joinSignal(signalKey, meId, onPing, onState) {
      let left = false;
      const { hub, release } = acquire(`meet:${signalKey}`, "ping", {
        onMessage(payload) {
          const from = (payload as { from?: unknown } | null)?.from;
          if (!left && typeof from === "string" && from !== meId) onPing(from);
        },
        onState(state) {
          if (!left) onState(state);
        },
      });
      return {
        async ping() {
          if (left || !hub.channel) return;
          // ถ้าช่องยังไม่เชื่อม supabase-js จะส่งทาง REST แทน
          await hub.channel.send({
            type: "broadcast",
            event: "ping",
            payload: { type: "ping", from: meId },
          });
        },
        leave() {
          if (left) return;
          left = true;
          release();
        },
      };
    },
  };
}

let supabaseTransport: MeetupTransport | null = null;
let localTransport: MeetupTransport | null = null;

/**
 * ตัวจำลองในเครื่องเฉพาะ dev + `?meetsim` เท่านั้น — `import.meta.env.DEV` เป็นค่าคงที่ตอน build
 * กิ่งนี้จึงเป็นโค้ดตายใน production และ meetup-transport-local ถูกตัดทิ้งทั้งไฟล์
 */
export function getMeetupTransport(): MeetupTransport {
  if (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("meetsim")
  ) {
    if (!localTransport) {
      const pair = meetsimPairFromSearch(window.location.search);
      if (pair) seedConnection(pair.connectionId, pair.a, pair.b);
      localTransport = createLocalTransport();
    }
    return localTransport;
  }
  supabaseTransport ??= createSupabaseTransport({ db, realtime: supabase });
  return supabaseTransport;
}

/**
 * สถานะคำชวนเจอของผู้ใช้ในเครื่องนี้ — ฟังก์ชันล้วน (ไม่แตะ React / Supabase) เพื่อทดสอบได้
 * MeetupProvider (meetup-context.tsx) ใช้ reducer และตัวช่วยในไฟล์นี้ทั้งหมด
 */
import {
  acceptedForInviter,
  incomingPending,
  isActive,
  type Meetup,
  type MeetupStatus,
} from "./meetup-rules";
import type { ConnectResult } from "./store";
import type { Connection } from "./types";

export type MeetupState = {
  meetups: Meetup[];
  /** คำชวนที่กำลังเปิดโหมดหากันอยู่ */
  findId: string | null;
  /** คำชวนของฉันที่อีกฝ่ายรับแล้วและฉันเห็นการ์ดแล้ว (เก็บใน localStorage) */
  seenAccepted: string[];
};

export type MeetupAction =
  /** ผลจาก `list` — รวมตาม id; `replace` ใช้ตอนเปลี่ยนตัวตน (ทิ้งของคนเดิม) */
  | { type: "loaded"; meetups: Meetup[]; replace?: boolean }
  | { type: "upserted"; meetup: Meetup }
  | { type: "seenAccepted"; id: string }
  | { type: "openFind"; id: string; now: number }
  | { type: "closeFind" };

export const SEEN_ACCEPTED_KEY = "meetups:seen-accepted";
/** เก็บ id ที่เห็นแล้วไว้ไม่เกินเท่านี้ (ใหม่สุดท้ายรายการ) */
export const SEEN_ACCEPTED_LIMIT = 200;
/** กริ่ง (ช่อง inbox เป็นช่องสาธารณะ) ทำให้ดึงรายการได้ไม่เกิน 1 ครั้งต่อช่วงนี้ */
export const KNOCK_GAP_MS = 1_500;

export function initialMeetupState(seenAccepted: string[] = []): MeetupState {
  return { meetups: [], findId: null, seenAccepted };
}

/**
 * สถานะเดินหน้าทางเดียว (pending → accepted/declined/cancelled → done/cancelled)
 * ผลการดึงที่ช้ากว่าการกดของเราจึงไม่ทำให้แถวถอยหลัง
 */
const STATUS_RANK: Record<MeetupStatus, number> = {
  pending: 0,
  accepted: 1,
  declined: 2,
  done: 2,
  cancelled: 2,
};

function newer(current: Meetup, incoming: Meetup): Meetup {
  return STATUS_RANK[incoming.status] >= STATUS_RANK[current.status] ? incoming : current;
}

function mergeMeetups(current: readonly Meetup[], incoming: readonly Meetup[]): Meetup[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) {
    const prev = byId.get(m.id);
    byId.set(m.id, prev ? newer(prev, m) : m);
  }
  return [...byId.values()];
}

/** ถ้าคำชวนของโหมดหากันไม่ใช่ accepted แล้ว (อีกฝ่ายกดเจอแล้ว/ยกเลิก) ปิดโหมด */
function withValidFind(state: MeetupState): MeetupState {
  if (state.findId === null) return state;
  const m = state.meetups.find((x) => x.id === state.findId);
  return m && m.status === "accepted" ? state : { ...state, findId: null };
}

export function meetupReducer(state: MeetupState, action: MeetupAction): MeetupState {
  switch (action.type) {
    case "loaded": {
      const meetups = action.replace
        ? [...action.meetups]
        : mergeMeetups(state.meetups, action.meetups);
      return withValidFind({ ...state, meetups });
    }
    case "upserted":
      return withValidFind({ ...state, meetups: mergeMeetups(state.meetups, [action.meetup]) });
    case "seenAccepted": {
      if (state.seenAccepted.includes(action.id)) return state;
      const seenAccepted = [...state.seenAccepted, action.id].slice(-SEEN_ACCEPTED_LIMIT);
      return { ...state, seenAccepted };
    }
    case "openFind": {
      const m = state.meetups.find((x) => x.id === action.id);
      if (!m || m.status !== "accepted" || !isActive(m, action.now)) return state;
      return { ...state, findId: m.id };
    }
    case "closeFind":
      return state.findId === null ? state : { ...state, findId: null };
  }
}

export function selectIncoming(state: MeetupState, meId: string | null, now: number): Meetup[] {
  return meId ? incomingPending(state.meetups, meId, now) : [];
}

export function selectAcceptedForMe(
  state: MeetupState,
  meId: string | null,
  now: number,
): Meetup[] {
  return meId ? acceptedForInviter(state.meetups, meId, now, new Set(state.seenAccepted)) : [];
}

/** คำชวนของโหมดหากัน — การหมดอายุระหว่างเปิดอยู่ FindMode จัดการเอง (ปิด + แจ้ง) */
export function selectFindSession(state: MeetupState): Meetup | null {
  if (state.findId === null) return null;
  return state.meetups.find((m) => m.id === state.findId) ?? null;
}

export function parseSeenAccepted(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(-SEEN_ACCEPTED_LIMIT);
  } catch {
    return [];
  }
}

/**
 * ตัวตนของฉันสำหรับคำชวนเจอ — dev + `?meetsim&as=<id>` ใช้ id นั้นแทน
 * (สองแท็บใช้ localStorage ร่วมกัน แต่ละแท็บจึงต้องมีตัวตนของตัวเอง); นอกนั้นใช้รหัสจาก store
 */
export function resolveMeId(storeId: string | null, search: string, dev: boolean): string | null {
  if (!dev) return storeId;
  const params = new URLSearchParams(search);
  if (!params.has("meetsim")) return storeId;
  const as = params.get("as")?.trim();
  return as ? as : storeId;
}

/** อีกฝ่ายของคอนเนกชัน — คอนเนกชันใน store ใช้ "me" แทนตัวเรา, คู่จำลอง (?pair) ใช้รหัสจริง */
export function otherInConnection(
  conn: Pick<Connection, "user_a" | "user_b">,
  meId: string,
): string | null {
  if (conn.user_a === "me" || conn.user_a === meId) return conn.user_b;
  if (conn.user_b === "me" || conn.user_b === meId) return conn.user_a;
  return null;
}

/** ชื่ออีกฝ่าย: ชื่อใน store ก่อน; ใน meetsim ใช้ "ผู้ทดสอบ xxxx" เพราะคนจำลองไม่มีโปรไฟล์ */
export function partnerName(storeName: string | undefined, id: string, meetsim: boolean): string {
  if (storeName) return storeName;
  return meetsim ? `ผู้ทดสอบ ${id.slice(0, 4)}` : "เพื่อนใหม่";
}

type Timers = {
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

/**
 * ตัวคุมการดึงรายการคำชวน
 * - `now()` ดึงทันที (โหลดครั้งแรก, ทุก 20 วินาที, กลับมาเปิดจอ, หลังกดเอง)
 * - `knock()` จากกริ่ง: ดึงทันทีถ้าห่างจากครั้งก่อนเกิน `gapMs` ไม่อย่างนั้นรวมกริ่งทั้งหมดเป็น
 *   การดึงครั้งเดียวตอนครบช่วง (trailing) — ช่อง inbox เป็นสาธารณะ จึงกันคนกดกริ่งรัวๆ
 * - ไม่ดึงซ้อนกันเกิน 1 ครั้ง: ขอระหว่างกำลังดึง → ดึงต่ออีก 1 ครั้งหลังเสร็จ (ผ่านช่วงห่างเดียวกัน)
 */
export function createReloadRunner(opts: { run: () => Promise<unknown>; gapMs: number } & Timers): {
  now(): void;
  knock(): void;
  dispose(): void;
} {
  const clock = opts.now ?? (() => Date.now());
  const setTimer = opts.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer =
    opts.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let inFlight = false;
  let queued = false;
  let lastStart = Number.NEGATIVE_INFINITY;
  let timer: unknown = null;
  let disposed = false;

  const start = () => {
    if (disposed) return;
    if (inFlight) {
      queued = true;
      return;
    }
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    inFlight = true;
    lastStart = clock();
    let p: Promise<unknown>;
    try {
      p = Promise.resolve(opts.run());
    } catch (err) {
      p = Promise.reject(err);
    }
    void p
      .catch(() => {
        /* เน็ตล่ม: เก็บของเดิมไว้ รอรอบถัดไป */
      })
      .finally(() => {
        inFlight = false;
        if (queued) {
          queued = false;
          throttled();
        }
      });
  };

  const throttled = () => {
    if (disposed) return;
    if (inFlight) {
      queued = true;
      return;
    }
    if (timer !== null) return;
    const wait = lastStart + opts.gapMs - clock();
    if (wait <= 0) {
      start();
      return;
    }
    timer = setTimer(() => {
      timer = null;
      start();
    }, wait);
  };

  return {
    now: start,
    knock: throttled,
    dispose() {
      disposed = true;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
  };
}

export type InviteResult = "sent" | "existing" | "failed";

/**
 * ขอเชื่อมต่อแล้วส่งคำชวนเจอให้อัตโนมัติเมื่อเป็นคอนเนกชันใหม่ (ไม่รอผลคำชวน)
 * โหมด `?dryrun` ไม่เรียกทั้งสองอย่าง (คืน ok:false — ผู้เรียกจัดการ dry-run เองอยู่แล้ว)
 */
export function connectAndInvite(
  deps: {
    dryrun: boolean;
    connect: (otherId: string, score: number, reason: string) => Promise<ConnectResult>;
    invite: (connection: Connection) => Promise<InviteResult>;
    onInviteFailed?: () => void;
  },
  otherId: string,
  score: number,
  reason: string,
): Promise<ConnectResult> {
  if (deps.dryrun) return Promise.resolve({ ok: false });
  return deps.connect(otherId, score, reason).then((result) => {
    if (result.ok && !result.existed) {
      const fail = () => deps.onInviteFailed?.();
      void deps.invite(result.connection).then((r) => {
        if (r === "failed") fail();
      }, fail);
    }
    return result;
  });
}

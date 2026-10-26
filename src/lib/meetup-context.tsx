/**
 * MeetupProvider — เจ้าของสถานะคำชวนเจอของผู้ใช้ในเครื่องนี้ (spec §2–3)
 * - โหลดคำชวนตอนเปิด, ฟังกริ่ง `inbox:<ฉัน>` (ไม่มีเนื้อหา) แล้วดึงใหม่, ดึงทุก 20 วินาทีขณะเปิดจอ
 *   และทุกครั้งที่กลับมาเปิดจอ
 * - ปุ่มต่างๆ (ชวน/ตกลง/ไว้ทีหลัง/เจอแล้ว/ยกเลิก) เขียนผ่าน transport แล้วเคาะกริ่งอีกฝ่าย
 * - ไม่ทำงานเครือข่ายใดๆ ในหน้าหลังบ้าน/หน้าพิมพ์ (`themeClassFor` เป็น undefined)
 * - FindMode (Task 7) อ่าน `findSession` จาก context นี้ — ไฟล์นี้ไม่เรนเดอร์มันเอง
 */
import { useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { isDevPreview } from "./dev-preview";
import { canInvite, isActive, POLL_MS, type Meetup, type MeetupStatus } from "./meetup-rules";
import {
  KNOCK_GAP_MS,
  SEEN_ACCEPTED_KEY,
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
  type InviteResult,
} from "./meetup-state";
import { getMeetupTransport, type MeetupTransport } from "./meetup-transport";
import { meetsimPairFromSearch } from "./meetup-transport-local";
import { themeClassFor } from "./theme";
import { useStore, type ConnectResult } from "./store";
import type { Connection, User } from "./types";

export { meetupReducer, resolveMeId, type MeetupAction, type MeetupState } from "./meetup-state";

export type MeetupsApi = {
  meetups: Meetup[];
  incoming: Meetup[];
  acceptedForMe: Meetup[];
  findSession: Meetup | null;
  invite(connectionId: string): Promise<InviteResult>;
  accept(id: string): Promise<"ok" | "expired" | "failed">;
  decline(id: string): Promise<void>;
  finish(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  openFind(id: string): void;
  closeFind(): void;
  markAcceptedSeen(id: string): void;
  canInviteFor(connectionId: string): boolean;
  /** ตัวตนที่ใช้กับคำชวน (dev `?meetsim&as=` แทนได้) — FindMode ใช้กับ joinSignal */
  meId: string | null;
  /** อีกฝ่ายของคำชวน: รหัส, โปรไฟล์ใน store (ถ้ามี) และชื่อที่แสดง */
  partnerOf(m: Meetup): { id: string; user: User | undefined; name: string };
};

type Internal = MeetupsApi & { inviteConnection(conn: Connection): Promise<InviteResult> };

const MeetupCtx = createContext<Internal | null>(null);

/** search ของหน้าแรกที่เข้า meetsim — ลิงก์ภายในทิ้ง `?as` / `?pair` ได้ ตัวตนแท็บต้องไม่หาย */
let latchedMeetsimSearch: string | null = null;
function meetsimSearch(): string {
  if (typeof window === "undefined") return "";
  if (latchedMeetsimSearch !== null) return latchedMeetsimSearch;
  const search = window.location.search;
  if (import.meta.env.DEV && new URLSearchParams(search).has("meetsim")) {
    latchedMeetsimSearch = search;
  }
  return search;
}

function isMeetsim(): boolean {
  return import.meta.env.DEV && new URLSearchParams(meetsimSearch()).has("meetsim");
}

function readSeen(): string[] {
  try {
    return parseSeenAccepted(globalThis.localStorage?.getItem(SEEN_ACCEPTED_KEY) ?? null);
  } catch {
    return [];
  }
}

function transport(): MeetupTransport {
  return getMeetupTransport();
}

export function MeetupProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const enabled = themeClassFor(pathname) !== undefined;

  const [state, dispatch] = useReducer(meetupReducer, undefined, () =>
    initialMeetupState(readSeen()),
  );
  const [now, setNow] = useState(() => Date.now());

  // ตัวตนตัดสินหลัง mount (SSR ไม่รู้ search/localStorage)
  const [search, setSearch] = useState("");
  useEffect(() => setSearch(meetsimSearch()), []);
  const meetsim = import.meta.env.DEV && new URLSearchParams(search).has("meetsim");
  const meId = resolveMeId(store.myParticipantId, search, import.meta.env.DEV);

  const meIdRef = useRef(meId);
  meIdRef.current = meId;
  const connectionsRef = useRef(store.connections);
  connectionsRef.current = store.connections;
  const stateRef = useRef(state);
  stateRef.current = state;

  /** ดึงรายการของฉันแล้วรวมเข้าสถานะ — โยน error ต่อ (ผู้เรียกเลือกเองว่าจะเงียบไหม) */
  const load = useCallback(async (me: string) => {
    const list = await transport().list(me);
    if (meIdRef.current !== me) return; // เปลี่ยนตัวตนระหว่างรอ
    dispatch({ type: "loaded", meetups: list });
    setNow(Date.now());
  }, []);

  // เปลี่ยนตัวตน (เช่น เพิ่งสร้างโปรไฟล์) → ทิ้งคำชวนของตัวตนเดิม
  const lastMeRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastMeRef.current !== null && lastMeRef.current !== meId) {
      dispatch({ type: "loaded", meetups: [], replace: true });
      dispatch({ type: "closeFind" });
    }
    lastMeRef.current = meId;
  }, [meId]);

  // โหลด + กริ่ง + ดึงสำรองทุก 20 วินาที + กลับมาเปิดจอ
  useEffect(() => {
    if (!enabled || !meId) return;
    const me = meId;
    const runner = createReloadRunner({ run: () => load(me), gapMs: KNOCK_GAP_MS });
    runner.now();
    const off = transport().onKnock(me, () => runner.knock());
    const visible = () => document.visibilityState === "visible";
    const poll = window.setInterval(() => {
      if (visible()) runner.now();
    }, POLL_MS);
    const onVisibility = () => {
      if (visible()) runner.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      off();
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      runner.dispose();
    };
  }, [enabled, meId, load]);

  // เรนเดอร์ใหม่ตอนคำชวนที่ใกล้หมดอายุที่สุดหมดเวลา (การ์ดหายเอง)
  useEffect(() => {
    const t = Date.now();
    const next = state.meetups
      .filter((m) => isActive(m, t))
      .reduce((min, m) => Math.min(min, Date.parse(m.expiresAt)), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(next)) return;
    const h = window.setTimeout(() => setNow(Date.now()), Math.max(0, next - t) + 50);
    return () => window.clearTimeout(h);
  }, [state.meetups]);

  // จำว่าเห็นการ์ด "พร้อมเจอแล้ว" ไหนไปแล้ว
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_ACCEPTED_KEY, JSON.stringify(state.seenAccepted));
    } catch {
      /* โหมดส่วนตัว / เต็ม */
    }
  }, [state.seenAccepted]);

  /** คอนเนกชันจาก store หรือคู่จำลอง `?meetsim&pair=` (เมื่อ store ไม่มี) */
  const findConnection = useCallback(
    (connectionId: string): Pick<Connection, "id" | "user_a" | "user_b"> | null => {
      const conn = connectionsRef.current.find((c) => c.id === connectionId);
      if (conn) return conn;
      if (import.meta.env.DEV && isMeetsim()) {
        const pair = meetsimPairFromSearch(meetsimSearch());
        if (pair && pair.connectionId === connectionId) {
          return { id: pair.connectionId, user_a: pair.a, user_b: pair.b };
        }
      }
      return null;
    },
    [],
  );

  const inviteConnection = useCallback(
    async (conn: Pick<Connection, "id" | "user_a" | "user_b">): Promise<InviteResult> => {
      const me = meIdRef.current;
      if (!me) return "failed";
      const other = otherInConnection(conn, me);
      if (!other) return "failed";
      try {
        const t = transport();
        const res = await t.create({ connectionId: conn.id, inviter: me, invitee: other });
        if (!res.ok) return "failed";
        dispatch({ type: "upserted", meetup: res.meetup });
        setNow(Date.now());
        if (res.existing) return "existing";
        void t.knock(other);
        return "sent";
      } catch {
        return "failed";
      }
    },
    [],
  );

  const invite = useCallback(
    (connectionId: string) => {
      const conn = findConnection(connectionId);
      return conn ? inviteConnection(conn) : Promise.resolve<InviteResult>("failed");
    },
    [findConnection, inviteConnection],
  );

  /**
   * เปลี่ยนสถานะ — ดึงรายการก่อนเสมอ (ตัวจำลองรู้ว่าใครกดจาก meId ล่าสุดที่ส่งเข้า list
   * และได้แถวล่าสุดมาเทียบ) แล้วเคาะกริ่งอีกฝ่ายเมื่อสำเร็จ
   */
  const changeStatus = useCallback(
    async (
      id: string,
      to: MeetupStatus,
    ): Promise<{ ok: true; meetup: Meetup } | { ok: false; reason: string }> => {
      const me = meIdRef.current;
      if (!me) return { ok: false, reason: "no-me" };
      const t = transport();
      try {
        await load(me);
      } catch {
        /* ยังลองเขียนต่อ — setStatus ตอบเหตุผลเอง */
      }
      try {
        const res = await t.setStatus(id, to);
        if (!res.ok) return res;
        dispatch({ type: "upserted", meetup: res.meetup });
        setNow(Date.now());
        const m = res.meetup;
        void t.knock(m.inviter === me ? m.invitee : m.inviter);
        return res;
      } catch {
        return { ok: false, reason: "network" };
      }
    },
    [load],
  );

  const accept = useCallback(
    async (id: string): Promise<"ok" | "expired" | "failed"> => {
      const res = await changeStatus(id, "accepted");
      if (res.ok) {
        dispatch({ type: "openFind", id, now: Date.now() });
        return "ok";
      }
      return res.reason === "expired" ? "expired" : "failed";
    },
    [changeStatus],
  );

  const decline = useCallback(
    async (id: string) => {
      await changeStatus(id, "declined");
    },
    [changeStatus],
  );

  const finish = useCallback(
    async (id: string) => {
      // "เจอกันแล้ว!" ปิดโหมดของเครื่องนี้เสมอ แม้เขียนไม่สำเร็จ (อีกเครื่องปิดเมื่อเห็น done)
      if (stateRef.current.findId === id) dispatch({ type: "closeFind" });
      await changeStatus(id, "done");
    },
    [changeStatus],
  );

  const cancel = useCallback(
    async (id: string) => {
      if (stateRef.current.findId === id) dispatch({ type: "closeFind" });
      await changeStatus(id, "cancelled");
    },
    [changeStatus],
  );

  const openFind = useCallback((id: string) => {
    dispatch({ type: "openFind", id, now: Date.now() });
  }, []);
  const closeFind = useCallback(() => dispatch({ type: "closeFind" }), []);
  const markAcceptedSeen = useCallback((id: string) => {
    dispatch({ type: "seenAccepted", id });
  }, []);

  const users = store.users;
  const partnerOf = useCallback(
    (m: Meetup) => {
      const id = m.inviter === meId ? m.invitee : m.inviter;
      const user = users.find((u) => u.id === id);
      return { id, user, name: partnerName(user?.name, id, meetsim) };
    },
    [meetsim, users, meId],
  );

  const value = useMemo<Internal>(
    () => ({
      meetups: state.meetups,
      incoming: selectIncoming(state, meId, now),
      acceptedForMe: selectAcceptedForMe(state, meId, now),
      findSession: selectFindSession(state),
      invite,
      accept,
      decline,
      finish,
      cancel,
      openFind,
      closeFind,
      markAcceptedSeen,
      canInviteFor: (connectionId: string) =>
        meId !== null && canInvite(state.meetups, connectionId, Date.now()),
      meId,
      partnerOf,
      inviteConnection,
    }),
    [
      state,
      meId,
      now,
      invite,
      accept,
      decline,
      finish,
      cancel,
      openFind,
      closeFind,
      markAcceptedSeen,
      partnerOf,
      inviteConnection,
    ],
  );

  return <MeetupCtx.Provider value={value}>{children}</MeetupCtx.Provider>;
}

function useInternal(): Internal {
  const ctx = useContext(MeetupCtx);
  if (!ctx) throw new Error("useMeetups must be used inside MeetupProvider");
  return ctx;
}

export function useMeetups(): MeetupsApi {
  return useInternal();
}

/**
 * ใช้แทน `store.connect` ที่จุดกดเชื่อมต่อ — คอนเนกชันใหม่ส่งคำชวนเจอให้อัตโนมัติ (ไม่รอผล)
 * ส่งคำชวนไม่สำเร็จ: การเชื่อมต่อยังอยู่ แจ้ง toast ให้กดชวนใหม่; `?dryrun` ไม่เรียกอะไรเลย
 */
export function useConnectAndInvite(): (
  otherId: string,
  score: number,
  reason: string,
) => Promise<ConnectResult> {
  const { connect } = useStore();
  const { inviteConnection } = useInternal();
  return useCallback(
    (otherId: string, score: number, reason: string) =>
      connectAndInvite(
        {
          dryrun: isDevPreview("dryrun"),
          connect,
          invite: inviteConnection,
          onInviteFailed: () =>
            toast.error("ยังส่งคำชวนเจอไม่สำเร็จ กดชวนใหม่ได้", { id: "meetup-invite-failed" }),
        },
        otherId,
        score,
        reason,
      ),
    [connect, inviteConnection],
  );
}

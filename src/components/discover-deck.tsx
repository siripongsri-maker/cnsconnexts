import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bookmark, Undo2, X } from "lucide-react";
import { scoreMatch, type DeckEntry } from "@/lib/matching";
import {
  ACTION_LOCK_MS,
  deckPrimaryAction,
  deckState,
  swipeOutcome,
  swipeRotation,
  tryAcquireLock,
  unseenEntries,
} from "@/lib/deck-rules";
import { connectionWith } from "@/lib/connect-rules";
import { useMotionSettings } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { ProfileSyncFailed } from "@/components/profile-sync-failed";
import { useRetryProfileSync } from "@/lib/use-retry-profile-sync";
import type { Connection, User } from "@/lib/types";
import { BOTTOM_NAV_HEIGHT_VAR } from "./bottom-nav";
import { MatchCard } from "./match-card";
import { MeadowScene } from "./meadow-scene";
import { PDPA_HEIGHT_VAR } from "./pdpa-consent";

/**
 * แถบปุ่มลอยชิดขอบบนของเมนูล่างพอดี (BottomNav วัดความสูงจริงใส่ตัวแปร CSS)
 * ค่าสำรองก่อนวัดเสร็จ = เมนู 77px + safe area; ถ้าแถบ PDPA ลอยอยู่ให้ยกขึ้นเหนือมัน
 */
const ACTION_BAR_BOTTOM = `calc(var(${BOTTOM_NAV_HEIGHT_VAR}, calc(77px + env(safe-area-inset-bottom))) + var(${PDPA_HEIGHT_VAR}, 0px))`;
/** ระยะลากที่เริ่มนับว่าเป็นการปัด (กันแตะลิงก์ในการ์ดแล้วการ์ดขยับ) */
const DRAG_START = 8;
/** เวลาให้การ์ดลอยออกก่อนเปลี่ยนใบ */
const LEAVE_MS = 200;

type Leave = "left" | "right";

/**
 * สำรับจับคู่ — การ์ดใหญ่ทีละใบ ปุ่มใหญ่ ข้าม / ขอเชื่อมต่อ / เก็บไว้
 * ปัดซ้าย = ข้าม ปัดขวา = เก็บไว้ (ทางลัดเสริม ปุ่มใช้ได้เสมอ)
 * ปุ่มหลักของแต่ละสถานะมี data-deck-primary ให้หน้าแม่ย้ายโฟกัสกลับมาได้ (เช่น หลังปิดจอฉลอง)
 */
export function DiscoverDeck({
  entries,
  me,
  loading = false,
  onNeedProfile,
  onConnected,
}: {
  entries: DeckEntry[];
  me: User | null;
  /** บังคับแสดงการ์ดโครงกำลังโหลด เช่น คนเดิมที่มีรหัสในเครื่องแต่โปรไฟล์ยังไม่มา */
  loading?: boolean;
  onNeedProfile: (target: User) => void;
  onConnected: (c: Connection, entry: DeckEntry) => void;
}) {
  const {
    connect,
    connections,
    toggleLikeUser,
    likedUsers,
    skipUser,
    undoSkip,
    skippedUsers,
    networkAvailable,
    hydrated,
    refresh,
    pendingProfile,
  } = useStore();
  const { retrying: syncing, retry: retryProfileSync } = useRetryProfileSync();
  const navigate = useNavigate();
  const { reducedMotion } = useMotionSettings();

  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<Leave | null>(null);
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  /** คนที่เพิ่งกดเชื่อมต่อในรอบนี้ — เลื่อนไปการ์ดถัดไป (ไม่เก็บลงรายการที่เก็บไว้) */
  const [passed, setPassed] = useState<string[]>([]);
  /** กำลังรอฐานข้อมูลยืนยันการเชื่อมต่อกับคนนี้ — ล็อกปุ่ม จอฉลองขึ้นเมื่อสำเร็จเท่านั้น */
  const [connecting, setConnecting] = useState<string | null>(null);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  /** ล็อกปุ่มถึงเวลานี้ (ms) — กันแตะซ้ำแล้วไปโดนการ์ดใบถัดไป */
  const lockUntil = useRef(0);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      if (lockTimer.current) clearTimeout(lockTimer.current);
    },
    [],
  );

  // คนที่ไม่มีชื่อถูกตัดตั้งแต่ buildDeck — ตัวนับบนหน้าแรกจึงตรงกับการ์ด
  const remaining = unseenEntries(entries, [...skippedUsers, ...likedUsers, ...passed]);
  const state = loading
    ? "loading"
    : deckState({
        hydrated,
        networkAvailable,
        total: entries.length,
        remaining: remaining.length,
      });
  const top = state === "ready" ? remaining[0] : undefined;

  const undoButton =
    skippedUsers.length > 0 ? (
      <button
        type="button"
        onClick={undoSkip}
        className="tap mx-auto mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-body font-semibold text-primary underline underline-offset-4"
      >
        <Undo2 className="h-6 w-6 shrink-0" aria-hidden />
        ย้อนการ์ดที่ข้าม
      </button>
    ) : null;

  if (state === "loading") {
    return (
      <section className="mx-auto w-full max-w-xl px-4">
        <div role="status" className="meadow-card p-5">
          <div aria-hidden className="motion-safe:animate-pulse">
            <div className="flex items-center justify-between gap-3">
              <div className="h-[72px] w-[72px] rounded-full bg-sky-soft" />
              <div className="h-[84px] w-[84px] rounded-full bg-sky-soft" />
            </div>
            <div className="mt-4 h-8 w-2/3 rounded-lg bg-sky-soft" />
            <div className="mt-3 h-24 rounded-2xl bg-sky-soft" />
          </div>
          <p className="mt-4 text-center text-body text-ink-soft">กำลังหาคนที่ควรเจอ…</p>
        </div>
      </section>
    );
  }

  if (state === "error") {
    const retry = async () => {
      if (retrying) return;
      setRetrying(true);
      try {
        await refresh();
      } catch {
        // ยังโหลดไม่ได้ — คงหน้าลองอีกครั้งไว้
      } finally {
        setRetrying(false);
      }
    };
    return (
      <section className="mx-auto w-full max-w-xl px-4">
        <div className="meadow-card flex flex-col items-center gap-4 p-6 text-center">
          <h2 className="font-heading text-title text-ink">ยังโหลดรายชื่อไม่ได้</h2>
          <button
            type="button"
            onClick={retry}
            data-deck-primary
            aria-disabled={retrying}
            aria-busy={retrying}
            className="meadow-btn-secondary tap aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </section>
    );
  }

  if (state === "empty" || !top) {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col px-4">
        <div className="meadow-card overflow-hidden text-center">
          <MeadowScene variant="empty" className="pointer-events-none" />
          <div className="flex flex-col items-center gap-3 p-6">
            <h2 className="font-heading text-title text-ink">คุณดูครบทุกคนแล้ว</h2>
            <Link
              to="/commitments"
              hash="saved"
              data-deck-primary
              className="meadow-btn-primary tap w-full max-w-sm text-center"
            >
              ดูคนที่เก็บไว้
            </Link>
            <Link to="/map" className="meadow-btn-secondary tap w-full max-w-sm text-center">
              สำรวจแผนที่
            </Link>
          </div>
        </div>
        {undoButton}
      </section>
    );
  }

  const user = top.user;
  const existing = connectionWith(connections, user.id);
  const isConnecting = connecting === user.id;
  const action = deckPrimaryAction({
    hasProfile: me !== null,
    // ระหว่างรอยืนยัน คอนเนกชันชั่วคราวอยู่ในรายการแล้ว — ยังไม่นับว่าเชื่อมกันจนกว่าจะสำเร็จ
    connected: !!existing && !isConnecting,
    pendingProfile: pendingProfile !== null,
  });
  const saved = likedUsers.includes(user.id);
  const locked = busy || leaving !== null || connecting !== null || syncing;

  /**
   * ขอสิทธิ์ทำงานหนึ่งครั้ง — ล็อกปุ่มไว้ ACTION_LOCK_MS ให้การ์ดเลื่อนและฉากถัดไปขึ้นก่อน
   * แตะซ้ำในช่วงนี้ไม่มีผล (ใช้ ref จึงกันได้แม้ state ยังไม่ทันอัปเดต)
   */
  const acquire = (): boolean => {
    if (leaving) return false;
    const next = tryAcquireLock(lockUntil.current, Date.now());
    if (next === null) return false;
    lockUntil.current = next;
    setBusy(true);
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => {
      lockTimer.current = null;
      setBusy(false);
    }, ACTION_LOCK_MS);
    return true;
  };

  /** ให้การ์ดลอยออกก่อน แล้วค่อยเปลี่ยนใบ (ลดการเคลื่อนไหว = เปลี่ยนทันที) */
  const leave = (dir: Leave, run: () => void) => {
    startX.current = null;
    setDragging(false);
    if (reducedMotion) {
      setDrag(0);
      run();
      return;
    }
    setLeaving(dir);
    leaveTimer.current = setTimeout(() => {
      leaveTimer.current = null;
      run();
      setLeaving(null);
      setDrag(0);
    }, LEAVE_MS);
  };

  const doSkip = () => {
    if (!acquire()) return;
    leave("left", () => {
      skipUser(user.id);
      toast(`ข้าม ${user.name} แล้ว`, {
        id: "deck-skip-undo",
        duration: 5000,
        action: { label: "ย้อน", onClick: undoSkip },
      });
    });
  };

  const doSave = () => {
    if (!acquire()) return;
    leave("right", () => {
      toggleLikeUser(user.id);
      toast(`เก็บ ${user.name} ไว้แล้ว`, { id: "deck-save" });
    });
  };

  const doPrimary = () => {
    if (!acquire()) return;
    if (action === "open-profile-sheet") {
      onNeedProfile(user);
      return;
    }
    if (action === "open-connection") {
      if (existing) navigate({ to: "/connection/$id", params: { id: existing.id } });
      return;
    }
    if (action === "retry-profile-sync") {
      // โปรไฟล์ยังไม่ขึ้นระบบ — เชื่อมต่อไปก็จะหายเอง ให้ส่งโปรไฟล์ก่อน (แจ้งผลด้วย toast)
      void retryProfileSync();
      return;
    }
    // action === "connect": เรียกครั้งเดียว ล็อกปุ่มจนฐานข้อมูลตอบ แล้วค่อยเลื่อนการ์ดและฉลอง
    if (!me) return;
    const entry = top;
    const m = entry.match ?? scoreMatch(me, user);
    setConnecting(user.id);
    void connect(user.id, m.score, m.reason).then((result) => {
      setConnecting(null);
      // ไม่สำเร็จ: store ถอนคอนเนกชันและแจ้ง toast แล้ว การ์ดเดิมยังอยู่ให้ลองใหม่ ไม่มีจอฉลอง
      if (!result.ok) return;
      if (result.existed) {
        navigate({ to: "/connection/$id", params: { id: result.connection.id } });
        return;
      }
      setPassed((p) => [...p, user.id]);
      onConnected(result.connection, entry);
    });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (locked || (e.pointerType === "mouse" && e.button !== 0)) return;
    startX.current = e.clientX;
    moved.current = false;
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (locked || startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (!moved.current && Math.abs(dx) > DRAG_START) {
      moved.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (moved.current) setDrag(dx);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    const outcome = swipeOutcome(drag);
    if (outcome === "skip") doSkip();
    else if (outcome === "save") doSave();
    else setDrag(0);
  };
  const cancelDrag = () => {
    startX.current = null;
    setDragging(false);
    setDrag(0);
  };

  const transform = leaving
    ? `translateX(${leaving === "left" ? -120 : 120}%) rotate(${leaving === "left" ? -12 : 12}deg)`
    : `translateX(${drag}px) rotate(${swipeRotation(drag)}deg)`;

  return (
    // display: contents — ให้แถบปุ่ม sticky ใช้ <main> เป็นกรอบแทนส่วนนี้ จึงลอยขึ้นเหนือเมนู/แถบ PDPA ได้
    // แม้สำรับเริ่มต่ำกว่าเส้นนั้นบนจอเตี้ย (sticky ขึ้นไปสูงกว่าขอบบนของกรอบตัวเองไม่ได้)
    <section className="contents">
      <div
        key={user.id}
        className="relative mx-auto w-full max-w-xl touch-pan-y select-none px-4"
        style={{
          transform,
          transition:
            dragging || reducedMotion
              ? undefined
              : `transform ${LEAVE_MS}ms cubic-bezier(0.22,1,0.36,1)`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={cancelDrag}
        onClickCapture={(e) => {
          // ลากการ์ดแล้วปล่อยบนลิงก์ ไม่นับเป็นการแตะลิงก์
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        <MatchCard entry={top} me={me} />
      </div>

      {undoButton && <div className="mx-auto flex w-full max-w-xl px-4">{undoButton}</div>}

      <div
        className="sticky z-20 mx-auto mt-4 w-full max-w-xl px-4"
        style={{ bottom: ACTION_BAR_BOTTOM }}
      >
        <div className="rounded-3xl bg-paper/95 p-2 backdrop-blur">
          {action === "retry-profile-sync" && (
            <p role="status" className="px-2 pb-2 text-center text-body font-semibold text-ink">
              <ProfileSyncFailed />
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={`ข้าม ${user.name}`}
              onClick={doSkip}
              aria-disabled={locked}
              className="tap grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-[#C9C6DA] bg-white text-ink-soft aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
            >
              <X className="h-7 w-7" strokeWidth={2.6} aria-hidden />
            </button>

            <button
              type="button"
              onClick={doPrimary}
              data-deck-primary
              aria-disabled={locked}
              className="meadow-btn-primary tap min-w-0 flex-1 px-4 text-center aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
            >
              {primaryLabel(action, isConnecting, syncing)}
            </button>

            <button
              type="button"
              aria-label={`เก็บ ${user.name} ไว้`}
              aria-pressed={saved}
              onClick={doSave}
              aria-disabled={locked}
              className="tap grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-[#C9C6DA] bg-white text-primary aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
            >
              <Bookmark
                className="h-7 w-7"
                strokeWidth={2.4}
                fill={saved ? "currentColor" : "none"}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** ข้อความบนปุ่มหลักตามสถานะ */
function primaryLabel(
  action: ReturnType<typeof deckPrimaryAction>,
  connecting: boolean,
  syncing: boolean,
): string {
  if (connecting) return "กำลังเชื่อมต่อ…";
  if (action === "open-connection") return "เชื่อมกันแล้ว · คุยต่อ";
  if (action === "retry-profile-sync") return syncing ? "กำลังส่ง…" : "ส่งโปรไฟล์";
  return "ขอเชื่อมต่อ";
}

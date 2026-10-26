/**
 * โหมดหากัน (spec §2, §4, §5) — dialog เต็มจอทั้งสองเครื่องหลังรับคำชวน
 * - พื้นเป็นสีของคู่ + สัญลักษณ์ใหญ่ + รูปและชื่ออีกฝ่าย + "ชูมือถือขึ้น มองหาจอ{สี}กับรูป{สัญลักษณ์}"
 * - "ส่งสัญญาณ" (เว้น 2 วินาที) · "เจอกันแล้ว!" (→ done แล้วไปหน้าคู่) · "ออก" / Esc (ปิดเฉพาะเครื่องนี้)
 * - รับสัญญาณ: เต้นแรง 2 ครั้ง + เสียง + สั่น (ถ้ามี); ช่องหลุด: แถบแจ้ง; หมดเวลา: ปิดเอง + toast
 * - ขอไม่ให้จอดับ (Wake Lock) ระหว่างเปิด ปล่อยเมื่อปิด
 * เรนเดอร์จาก __root ใต้ MeetupProvider เฉพาะธีมทุ่ง (meetup-context ไม่มี UI)
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

import {
  FIND_FLASH_MS,
  FIND_STRONG_TOTAL_MS,
  channelBanner,
  findColors,
  planStrongPulse,
} from "@/lib/find-mode-state";
import { useMeetups } from "@/lib/meetup-context";
import { tryPing, PING_GAP_MS, type Meetup } from "@/lib/meetup-rules";
import { getMeetupTransport, type ChannelState } from "@/lib/meetup-transport";
import { playConnext } from "@/lib/notify";
import { COLOR_TH, SYMBOL_TH, pairBadge } from "@/lib/pair-badge";
import { themeClassFor } from "@/lib/theme";

import { PairSymbol } from "./pair-symbol";
import { Avatar } from "./power-bits";

const MSG_FAILED = "ตอบไม่สำเร็จ ลองอีกครั้ง";
const MSG_EXPIRED = "หมดเวลาหากันแล้ว ชวนใหม่ได้จากหน้าคู่";

export function FindMode() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onMeadow = themeClassFor(pathname) === "meadow";
  const { findSession, meetups } = useMeetups();
  const navigate = useNavigate();

  // อีกฝ่ายกด "เจอกันแล้ว!" → แถวเป็น done และโหมดปิดเอง: พาเครื่องนี้ไปหน้าคู่ด้วย
  const lastRef = useRef<{ id: string; connectionId: string } | null>(null);
  const selfFinishedRef = useRef<string | null>(null);
  useEffect(() => {
    if (findSession) {
      lastRef.current = { id: findSession.id, connectionId: findSession.connectionId };
      return;
    }
    const last = lastRef.current;
    lastRef.current = null;
    if (!last || !onMeadow || selfFinishedRef.current === last.id) return;
    const row = meetups.find((m) => m.id === last.id);
    if (row?.status === "done") {
      void navigate({ to: "/connection/$id", params: { id: last.connectionId } });
    }
  }, [findSession, meetups, onMeadow, navigate]);

  if (!onMeadow || !findSession) return null;
  return (
    <FindModeDialog
      key={findSession.id}
      session={findSession}
      onSelfFinished={(id) => {
        selfFinishedRef.current = id;
      }}
    />
  );
}

/** `navigator.wakeLock` เมื่อเบราว์เซอร์มี (Safari เก่า/Firefox บางรุ่นไม่มี) */
function wakeLockApi(): WakeLock | undefined {
  return typeof navigator !== "undefined" && "wakeLock" in navigator
    ? navigator.wakeLock
    : undefined;
}

function useScreenWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let done = false;
    const request = async () => {
      try {
        const api = wakeLockApi();
        if (!api || document.visibilityState !== "visible") return;
        const s = await api.request("screen");
        if (done) void s.release().catch(() => {});
        else sentinel = s;
      } catch {
        /* ไม่อนุญาต/ไม่รองรับ — ไม่เป็นไร */
      }
    };
    void request();
    // ระบบปล่อยเองเมื่อสลับแอป — กลับมาแล้วขอใหม่
    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinel) void sentinel.release().catch(() => {});
      sentinel = null;
    };
  }, []);
}

function FindModeDialog({
  session,
  onSelfFinished,
}: {
  session: Meetup;
  onSelfFinished: (id: string | null) => void;
}) {
  const { closeFind, finish, meId, partnerOf } = useMeetups();
  const navigate = useNavigate();

  const badge = useMemo(() => pairBadge(session.signalKey), [session.signalKey]);
  const colors = useMemo(() => findColors(badge), [badge]);
  const partner = partnerOf(session);
  /** องค์ประกอบที่โฟกัสอยู่ก่อนเปิดโหมดนี้ — ตอนปิดดูว่ายังอยู่ในหน้าไหม */
  const openerRef = useRef<HTMLElement | null>(null);

  useScreenWakeLock();

  // หมดเวลาระหว่างเปิด (หรือเปิดมาตอนหมดแล้ว) → ปิด + toast
  const closeFindRef = useRef(closeFind);
  closeFindRef.current = closeFind;
  useEffect(() => {
    const ms = Date.parse(session.expiresAt) - Date.now();
    const h = window.setTimeout(
      () => {
        closeFindRef.current();
        toast(MSG_EXPIRED, { id: "meetup-find-expired" });
      },
      Math.max(0, Number.isFinite(ms) ? ms : 0),
    );
    return () => window.clearTimeout(h);
  }, [session.id, session.expiresAt]);

  // เต้นแรง: ไม่ตัดรอบที่กำลังเล่น (≤ 3 ครั้ง/วินาที) — ปิงที่มาระหว่างเล่นต่อคิวรอบถัดไปหนึ่งรอบ
  const [strong, setStrong] = useState<{ seq: number } | null>(null);
  const [flash, setFlash] = useState(false);
  const lastStartRef = useRef<number | null>(null);
  const pendingAtRef = useRef<number | null>(null);
  const timersRef = useRef<Set<number>>(new Set());
  const later = useCallback((fn: () => void, ms: number) => {
    const h = window.setTimeout(() => {
      timersRef.current.delete(h);
      fn();
    }, ms);
    timersRef.current.add(h);
  }, []);
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((h) => window.clearTimeout(h));
      timers.clear();
    };
  }, []);

  const startStrong = useCallback(() => {
    const now = Date.now();
    lastStartRef.current = now;
    pendingAtRef.current = null;
    setStrong((prev) => ({ seq: (prev?.seq ?? 0) + 1 }));
    setFlash(true);
    later(() => setFlash(false), FIND_FLASH_MS);
    later(() => {
      if (lastStartRef.current === now) setStrong(null);
    }, FIND_STRONG_TOTAL_MS);
  }, [later]);

  const pulse = useCallback(() => {
    const now = Date.now();
    const at = planStrongPulse(lastStartRef.current, pendingAtRef.current, now);
    if (at === null) return;
    if (at <= now) startStrong();
    else {
      pendingAtRef.current = at;
      later(startStrong, at - now);
    }
  }, [later, startStrong]);

  // ช่องสัญญาณของคู่ — ใช้ meId ของ context (dev `?as=` ต่างจาก store ได้)
  const [channel, setChannel] = useState<ChannelState>("connecting");
  const signalRef = useRef<{ ping(): Promise<void>; leave(): void } | null>(null);
  const pulseRef = useRef(pulse);
  pulseRef.current = pulse;
  useEffect(() => {
    if (!meId) return;
    const handle = getMeetupTransport().joinSignal(
      session.signalKey,
      meId,
      () => {
        pulseRef.current();
        try {
          playConnext({ speak: false });
        } catch {
          /* iOS ยังไม่ปลดล็อกเสียง */
        }
        try {
          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            navigator.vibrate([200, 100, 200]);
          }
        } catch {
          /* ไม่รองรับ */
        }
      },
      (s) => setChannel(s),
    );
    signalRef.current = handle;
    return () => {
      signalRef.current = null;
      handle.leave();
    };
  }, [session.signalKey, meId]);

  // ส่งสัญญาณ: เว้น 2 วินาที — ระหว่างรอยังโฟกัสได้ (aria-disabled) แต่กดแล้วไม่ทำอะไร
  const lastPingRef = useRef<number | null>(null);
  const [cooling, setCooling] = useState(false);
  function sendPing() {
    const now = Date.now();
    if (!tryPing(lastPingRef.current, now)) return;
    lastPingRef.current = now;
    setCooling(true);
    later(() => setCooling(false), PING_GAP_MS);
    pulse();
    const signal = signalRef.current;
    if (signal) void signal.ping().catch(() => {});
  }

  // เจอกันแล้ว: สำเร็จ → provider ปิดโหมดเอง แล้วไปหน้าคู่; ไม่สำเร็จ → ยังอยู่ในโหมดให้ลองใหม่
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  async function onFound() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    onSelfFinished(session.id);
    let result: "ok" | "failed";
    try {
      result = await finish(session.id);
    } catch {
      result = "failed";
    }
    busyRef.current = false;
    setBusy(false);
    if (result === "ok") {
      void navigate({ to: "/connection/$id", params: { id: session.connectionId } });
    } else {
      onSelfFinished(null);
      setNotice(MSG_FAILED);
    }
  }

  const banner = channelBanner(channel);
  const style = {
    "--find-bg": colors.bg,
    "--find-fg": colors.fg,
    "--find-flash": colors.fg,
    "--find-pulse-peak": String(colors.pulsePeak),
    "--find-strong-peak": String(colors.strongPeak),
  } as CSSProperties;

  const btnBase =
    "flex min-h-[56px] w-full items-center justify-center rounded-[18px] px-5 font-semibold focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--find-fg)] focus-visible:outline-solid";

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) closeFind();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-[55] overflow-hidden text-[var(--find-fg)] focus:outline-none"
          style={style}
          aria-describedby="find-mode-instruction"
          onPointerDownOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={() => {
            const active = document.activeElement;
            openerRef.current =
              active instanceof HTMLElement && active !== document.body ? active : null;
          }}
          onCloseAutoFocus={(event) => {
            // Dialog ไม่มี Trigger จึงไม่คืนโฟกัสเอง — คืนให้ปุ่มที่เปิดโหมดนี้ (ปุ่ม "เริ่มหากัน" บนหน้าคู่)
            // ปุ่มบนการ์ดคำชวนหายไปแล้ว (โฟกัสจะตกไป BODY) → ย้ายไปเนื้อหาหลักของหน้าแทน
            event.preventDefault();
            const opener = openerRef.current;
            if (opener?.isConnected) {
              opener.focus({ preventScroll: true });
              return;
            }
            const main = document.querySelector<HTMLElement>("main");
            if (!main) return;
            if (!main.hasAttribute("tabindex")) main.tabIndex = -1;
            main.style.outline = "none";
            main.focus({ preventScroll: true });
          }}
        >
          {/* ชั้นพื้นสี — เต้นเฉพาะชั้นนี้ (key เปลี่ยนเพื่อเริ่มแอนิเมชันใหม่ทุกครั้งที่ส่ง/รับสัญญาณ) */}
          <div
            key={strong ? `strong-${strong.seq}` : "idle"}
            aria-hidden="true"
            data-testid="find-mode-bg"
            className={`absolute inset-0 bg-[var(--find-bg)] ${
              strong ? "meadow-find-strong" : "meadow-find-pulse"
            } ${flash ? "meadow-find-flash" : ""}`}
          />

          <div
            className="relative flex h-full flex-col items-center gap-4 overflow-y-auto px-4 text-center"
            style={{
              paddingTop: "max(20px, env(safe-area-inset-top))",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
            }}
          >
            {banner && (
              <p
                role="status"
                className="w-full max-w-[30rem] rounded-2xl bg-[var(--find-fg)] px-4 py-2 text-body font-semibold text-[var(--find-bg)]"
              >
                {banner}
              </p>
            )}

            <div className="flex w-full max-w-[30rem] items-center justify-center gap-3">
              <span className="text-ink">
                <Avatar user={partner.user ?? { name: partner.name, avatar: "" }} size={64} />
              </span>
              <DialogPrimitive.Title className="min-w-0 break-words font-heading text-title font-semibold text-[var(--find-fg)]">
                {partner.name}
              </DialogPrimitive.Title>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <PairSymbol symbol={badge.symbol} className="h-auto w-[40vw] max-w-[22rem]" />
            </div>

            <p id="find-mode-instruction" className="max-w-[30rem] text-lead font-semibold">
              ชูมือถือขึ้น มองหาจอ{COLOR_TH[badge.color]}กับรูป{SYMBOL_TH[badge.symbol]}
            </p>

            {notice && (
              <p role="status" className="max-w-[30rem] text-body font-semibold">
                {notice}
              </p>
            )}

            <div className="flex w-full max-w-[30rem] flex-col gap-3">
              <button
                type="button"
                aria-disabled={cooling || undefined}
                onClick={sendPing}
                className={`${btnBase} min-h-[64px] bg-[var(--find-fg)] text-lead text-[var(--find-bg)] ${
                  cooling ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                ส่งสัญญาณ
              </button>
              <button
                type="button"
                aria-disabled={busy || undefined}
                aria-busy={busy || undefined}
                onClick={() => void onFound()}
                className={`${btnBase} border-[3px] border-[var(--find-fg)] text-lead ${
                  busy ? "cursor-progress opacity-60" : ""
                }`}
              >
                เจอกันแล้ว!
              </button>
              <DialogPrimitive.Close
                className={`${btnBase} text-body underline underline-offset-4`}
              >
                ออก
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

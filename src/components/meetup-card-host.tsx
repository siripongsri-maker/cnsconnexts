/**
 * การ์ดคำชวนเจอ (spec §2, §5) — ลอยบนสุดของจอผู้เข้าร่วม
 * - ผู้ถูกชวน: "{ชื่อ} อยากเจอคุณตอนนี้" → ตกลง เจอกันเลย / ไว้ทีหลัง
 * - ผู้ชวน (เฉพาะเมื่ออีกฝ่ายรับแล้ว): "{ชื่อ} พร้อมเจอแล้ว!" → เริ่มหากัน / ไว้ทีหลัง
 *   ผู้ชวนไม่เห็นอะไรเลยตอนอีกฝ่ายปฏิเสธ (เงียบ)
 * - ไม่โชว์เมื่อมี dialog เปิดอยู่หรืออยู่ในโหมดหากัน (รอคิว ไม่ทับ ไม่แย่งโฟกัส) และไม่โชว์นอกธีมทุ่ง
 */
import { useRouterState } from "@tanstack/react-router";
import { HeartHandshake, PartyPopper } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { inviteReason, notifyAccepted, notifyInvite, selectVisibleCard } from "@/lib/meetup-cards";
import { useMeetups } from "@/lib/meetup-context";
import { unlockAudio } from "@/lib/notify";
import { useStore } from "@/lib/store";
import { themeClassFor } from "@/lib/theme";

import { Avatar } from "./power-bits";

/**
 * dialog ที่เปิดอยู่: ที่ประกาศ aria-modal เอง (ฉากฉลอง, ทัวร์, เมนูมือถือ) และ Radix/vaul
 * (Dialog/Sheet/Drawer ใน components/ui) ซึ่งไม่ใส่ aria-modal แต่มี data-state="open"
 */
const OPEN_DIALOG = [
  '[role="dialog"][aria-modal="true"]',
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
].join(",");

const MSG_FAILED = "ตอบไม่สำเร็จ ลองอีกครั้ง";
const MSG_EXPIRED = "คำชวนนี้หมดเวลาแล้ว";

/** มี dialog เปิดอยู่ใน body ไหม (ติดตามด้วย MutationObserver; ปิดตอน unmount) */
function useDialogOpen(enabled: boolean): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      return;
    }
    const check = () => setOpen(document.querySelector(OPEN_DIALOG) !== null);
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role", "aria-modal", "data-state"],
    });
    return () => observer.disconnect();
  }, [enabled]);
  return open;
}

export function MeetupCardHost() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onMeadow = themeClassFor(pathname) === "meadow";

  const {
    incoming,
    acceptedForMe,
    findSession,
    accept,
    decline,
    openFind,
    markAcceptedSeen,
    partnerOf,
  } = useMeetups();
  const { me } = useStore();

  const domDialogOpen = useDialogOpen(onMeadow);
  const dialogOpen = domDialogOpen || findSession !== null;

  // คำชวนที่กดปิดเองหลังหมดเวลา — ซ่อนจนกว่า provider จะเอาออกจากรายการ
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const card = useMemo(
    () =>
      selectVisibleCard({
        incoming: incoming.filter((m) => !dismissed.has(m.id)),
        acceptedForMe: acceptedForMe.filter((m) => !dismissed.has(m.id)),
        dialogOpen,
      }),
    [incoming, acceptedForMe, dismissed, dialogOpen],
  );

  // เปิดเสียงบน iOS ด้วยการแตะครั้งแรกที่ไหนก็ได้
  useEffect(() => {
    if (!onMeadow) return;
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [onMeadow]);

  // ปิ๊งหนึ่งครั้งต่อคำชวนต่อการเปิดหน้า — นับตอนที่การ์ดโชว์จริง (ไม่ใช่ตอนติดคิวหลัง dialog)
  const chimed = useRef<Set<string>>(new Set());
  const cardId = card?.meetup.id ?? null;
  const cardKind = card?.kind ?? null;
  useEffect(() => {
    if (!onMeadow || cardId === null || chimed.current.has(cardId)) return;
    chimed.current.add(cardId);
    if (cardKind === "invite") notifyInvite();
    else notifyAccepted();
  }, [onMeadow, cardId, cardKind]);

  // ข้อความบนการ์ดและสถานะกำลังส่ง — ล้างทุกครั้งที่เปลี่ยนใบ
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [expiredId, setExpiredId] = useState<string | null>(null);
  useEffect(() => {
    setNotice(null);
    setBusy(false);
    busyRef.current = false;
    setExpiredId(null);
  }, [cardId]);

  // โฟกัสอยู่ในการ์ดไหม — การ์ดหาย/ปุ่มถูกแทนที่แล้วโฟกัสต้องไม่ตกไป BODY (ผู้ใช้คีย์บอร์ดจะหลง)
  const regionRef = useRef<HTMLDivElement>(null);
  const focusInCardRef = useRef(false);
  useEffect(() => {
    const inside = (node: EventTarget | null) =>
      node instanceof Node && (regionRef.current?.contains(node) ?? false);
    const track = (e: FocusEvent) => {
      focusInCardRef.current = inside(e.target);
    };
    // ผู้ใช้ย้ายโฟกัสออกจากการ์ดเอง → ลืมว่าเคยอยู่ในการ์ด (การ์ดเปลี่ยนทีหลังจะไม่ดึงโฟกัสกลับมา)
    // relatedTarget ว่าง: ถ้าปุ่มเดิมยังอยู่ในหน้าแต่โฟกัสไป BODY (แตะพื้นที่ว่าง) ก็ลืมเช่นกัน;
    // ถ้าปุ่มถูกถอดออก (การ์ดหาย/ถูกแทนที่) ยังจำไว้ให้ย้ายโฟกัสต่อ; สลับแท็บ/แอป โฟกัสยังอยู่ที่ปุ่ม
    const leave = (e: FocusEvent) => {
      if (!inside(e.target)) return;
      if (e.relatedTarget) {
        if (!inside(e.relatedTarget)) focusInCardRef.current = false;
        return;
      }
      const from = e.target as Node;
      window.setTimeout(() => {
        const active = document.activeElement;
        if (from.isConnected && (!active || active === document.body)) {
          focusInCardRef.current = false;
        }
      }, 0);
    };
    document.addEventListener("focusin", track);
    document.addEventListener("focusout", leave);
    return () => {
      document.removeEventListener("focusin", track);
      document.removeEventListener("focusout", leave);
    };
  }, []);
  useEffect(() => {
    if (!focusInCardRef.current) return;
    const active = document.activeElement;
    if (active && active !== document.body) return; // โฟกัสไปอยู่ที่อื่นแล้ว (เช่น โหมดหากันที่เพิ่งเปิด)
    focusInCardRef.current = false;
    // หมดเวลา → ปุ่ม "ปิด" มาแทนปุ่มตอบ; ใบถัดไปในคิวมาแทน → ปุ่มแรกของใบใหม่;
    // การ์ดหาย → เนื้อหาหลักของหน้า
    let target: HTMLElement | null =
      closeRef.current ?? regionRef.current?.querySelector<HTMLElement>("section button") ?? null;
    if (!target) {
      target =
        document.querySelector<HTMLElement>("#main-content") ??
        document.querySelector<HTMLElement>("main");
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.style.outline = "none";
    }
    target.focus({ preventScroll: true });
  }, [cardId, expiredId]);

  if (!onMeadow) return null;

  /** กันกดซ้ำ: ref ปิดทันที (state อัปเดตช้ากว่าการแตะสองครั้งติด) */
  async function run(task: () => Promise<"ok" | "expired" | "failed">, id: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    let result: "ok" | "expired" | "failed";
    try {
      result = await task();
    } catch {
      result = "failed";
    }
    busyRef.current = false;
    setBusy(false);
    if (result === "expired") {
      setNotice(MSG_EXPIRED);
      setExpiredId(id);
    } else if (result === "failed") {
      setNotice(MSG_FAILED);
    }
  }

  const partner = card ? partnerOf(card.meetup) : null;
  const name = partner?.name ?? "";
  const reason = card?.kind === "invite" ? inviteReason(me, partner?.user) : null;
  const expired = card !== null && expiredId === card.meetup.id;

  return (
    <div
      ref={regionRef}
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[45] flex justify-center px-4"
      style={{ top: "max(12px, env(safe-area-inset-top))" }}
    >
      {card && partner && (
        <section
          key={card.meetup.id}
          role="region"
          aria-label="คำชวนเจอ"
          className="meadow-card pointer-events-auto flex w-full max-w-[30rem] flex-col gap-3 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4"
        >
          <div className="flex items-center gap-3">
            <Avatar user={partner.user ?? { name, avatar: "" }} size={56} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 break-words font-heading text-lead font-semibold text-ink">
                {card.kind === "invite" ? (
                  <HeartHandshake className="size-6 shrink-0 text-primary" aria-hidden />
                ) : (
                  <PartyPopper className="size-6 shrink-0 text-primary" aria-hidden />
                )}
                <span className="min-w-0 break-words">
                  {card.kind === "invite" ? (
                    <>
                      {name} อยากเจอคุณ<span className="whitespace-nowrap">ตอนนี้</span>
                    </>
                  ) : (
                    `${name} พร้อมเจอแล้ว!`
                  )}
                </span>
              </p>
            </div>
          </div>

          {reason && <p className="rounded-2xl bg-sky-soft p-3 text-body text-ink">{reason}</p>}

          {notice && (
            <p className="text-body font-semibold text-ink" role="status">
              {notice}
            </p>
          )}

          {expired ? (
            <button
              ref={closeRef}
              type="button"
              className="meadow-btn-secondary w-full"
              onClick={() => setDismissed((prev) => new Set(prev).add(card.meetup.id))}
            >
              ปิด
            </button>
          ) : card.kind === "invite" ? (
            <div className="flex flex-col gap-2">
              {/* ระหว่างส่งใช้ aria-disabled ไม่ใช่ disabled — ปุ่มที่ถูก disable ทำให้โฟกัสหลุดไป BODY (กันกดซ้ำด้วย busyRef) */}
              <button
                type="button"
                className={`meadow-btn-primary w-full ${busy ? "opacity-[0.55]" : ""}`}
                aria-disabled={busy || undefined}
                onClick={() => void run(() => accept(card.meetup.id), card.meetup.id)}
              >
                ตกลง เจอกันเลย
              </button>
              <button
                type="button"
                className={`meadow-btn-secondary w-full ${busy ? "opacity-[0.55]" : ""}`}
                aria-disabled={busy || undefined}
                onClick={() => void run(() => decline(card.meetup.id), card.meetup.id)}
              >
                ไว้ทีหลัง
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="meadow-btn-primary w-full"
                onClick={() => {
                  markAcceptedSeen(card.meetup.id);
                  openFind(card.meetup.id);
                }}
              >
                เริ่มหากัน
              </button>
              <button
                type="button"
                className="meadow-btn-secondary w-full"
                onClick={() => markAcceptedSeen(card.meetup.id)}
              >
                ไว้ทีหลัง
              </button>
            </div>
          )}

          {card.moreCount > 0 && (
            <p className="text-center text-body text-ink-soft">อีก {card.moreCount} คำชวน</p>
          )}
        </section>
      )}
    </div>
  );
}

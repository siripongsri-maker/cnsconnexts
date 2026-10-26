/**
 * ปุ่มชวนเจอบนหน้าคู่ (/commitments แถวคอนเนกชัน, /connection/$id) — spec §2
 * - ยังไม่มีคำชวนที่ active → "ชวนเจอกันตอนนี้" (กันกดซ้ำ, ผลแจ้งด้วย toast รหัสเดียวไม่ซ้อนกัน)
 * - มีคำชวนที่รับแล้วและยังไม่หมดเวลา (ทั้งสองฝั่ง) → "เริ่มหากัน" เปิดโหมดหากัน
 *   โหมดหากันปิดแล้ว Radix คืนโฟกัสให้ปุ่มนี้เอง
 * - คำชวนของฉันยังรอตอบ → ข้อความ "รอ {ชื่อ} ตอบคำชวน"; คำชวนที่รอฉันตอบ → ไม่แสดงอะไร (การ์ดด้านบนถามอยู่แล้ว)
 */
import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { entryState, INVITE_RESULT_TOAST } from "@/lib/meetup-cards";
import { useMeetups } from "@/lib/meetup-context";
import type { InviteResult } from "@/lib/meetup-state";

const BUTTON = "meadow-btn-secondary tap min-h-12 w-full text-center";

export function MeetupEntry({
  connectionId,
  partnerName,
  className = "",
}: {
  connectionId: string;
  partnerName: string;
  className?: string;
}) {
  const { meetups, meId, invite, openFind } = useMeetups();
  const [pending, setPending] = useState(false);
  const busyRef = useRef(false);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** ชวนแล้วปุ่มจะหาย — จำกล่องที่ครอบไว้ให้ย้ายโฟกัสไปที่นั่นเมื่อไม่มีข้อความรอให้โฟกัส */
  const fallbackRef = useRef<HTMLElement | null>(null);
  const refocusRef = useRef(false);
  /** ปุ่มที่กดชวน — ย้ายโฟกัสเฉพาะเมื่อโฟกัสยังอยู่ที่ปุ่มนี้หรือหลุดไป BODY (ไม่แย่งจากที่ผู้ใช้ไปแล้ว) */
  const invokerRef = useRef<HTMLButtonElement | null>(null);

  const state = entryState(meetups, connectionId, meId, Date.now());

  // ชวนแล้วปุ่มหาย — ย้ายโฟกัสมาที่ข้อความรอ (หรือกล่องที่ครอบ ถ้าเป็นคำชวนที่รอเราตอบ) ไม่ปล่อยให้หลุดไป BODY
  useEffect(() => {
    if (!refocusRef.current || state.kind === "invite") return;
    refocusRef.current = false;
    const active = document.activeElement;
    const keeps = !active || active === document.body || active === invokerRef.current;
    invokerRef.current = null;
    if (!keeps) return;
    if (state.kind === "waiting") {
      noteRef.current?.focus({ preventScroll: true });
      return;
    }
    const box = fallbackRef.current;
    if (!box?.isConnected) return;
    if (!box.hasAttribute("tabindex")) box.tabIndex = -1;
    box.style.outline = "none";
    box.focus({ preventScroll: true });
  }, [state.kind]);

  if (state.kind === "none") return null;

  if (state.kind === "waiting") {
    return (
      <p
        ref={noteRef}
        tabIndex={-1}
        className={`break-words text-body text-ink-soft focus:outline-none ${className}`}
      >
        รอ {partnerName} ตอบคำชวน
      </p>
    );
  }

  if (state.kind === "start") {
    const id = state.meetup.id;
    return (
      <button
        type="button"
        aria-label={`เริ่มหากันกับ ${partnerName}`}
        className={`${BUTTON} ${className}`}
        onClick={() => openFind(id)}
      >
        <MapPin className="h-6 w-6 shrink-0" aria-hidden="true" />
        เริ่มหากัน
      </button>
    );
  }

  const onInvite = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    fallbackRef.current = buttonRef.current?.closest<HTMLElement>("li, section, main") ?? null;
    refocusRef.current = true;
    invokerRef.current = buttonRef.current;
    let result: InviteResult;
    try {
      result = await invite(connectionId);
    } catch {
      result = "failed";
    }
    busyRef.current = false;
    setPending(false);
    if (result === "failed") {
      refocusRef.current = false;
      invokerRef.current = null;
      toast.error(INVITE_RESULT_TOAST.failed, { id: "meetup-invite-failed" });
      return;
    }
    // ผลไม่ทำให้สถานะเปลี่ยน (เช่น แถวเดิมที่ยังเห็นว่า invite) → เลิกรอ ไม่ให้การเปลี่ยนรอบหลัง (เช่น ดึงทุก 20 วินาที) มาแย่งโฟกัส
    window.setTimeout(() => {
      refocusRef.current = false;
      invokerRef.current = null;
    }, 1000);
    toast.success(INVITE_RESULT_TOAST[result], { id: "meetup-invite-result" });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={`ชวนเจอกันตอนนี้กับ ${partnerName}`}
      aria-busy={pending}
      aria-disabled={pending}
      className={`${BUTTON} ${pending ? "opacity-60" : ""} ${className}`}
      onClick={() => void onInvite()}
    >
      <MapPin className="h-6 w-6 shrink-0" aria-hidden="true" />
      ชวนเจอกันตอนนี้
    </button>
  );
}

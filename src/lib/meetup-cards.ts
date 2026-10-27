/** ตรรกะล้วนของการ์ดคำชวนเจอ — เลือกการ์ดที่จะโชว์, เสียงแจ้ง, บรรทัดเหตุผล (ไม่แตะ React) */
import { scoreMatch } from "./matching";
import { isActive, type Meetup } from "./meetup-rules";
import { playConnext } from "./notify";
import type { User } from "./types";

export type VisibleCard = { kind: "invite" | "accepted"; meetup: Meetup; moreCount: number };

/**
 * การ์ดที่ควรโชว์ตอนนี้ — คำชวนที่รอฉันตอบก่อน แล้วค่อยการ์ด "พร้อมเจอแล้ว"
 * มี dialog/โหมดหากันเปิดอยู่ → ไม่โชว์ (รอคิว ไม่ทับ ไม่แย่งโฟกัส)
 * `moreCount` = จำนวนที่เหลือรอหลังจากใบนี้
 */
export function selectVisibleCard(input: {
  incoming: Meetup[];
  acceptedForMe: Meetup[];
  dialogOpen: boolean;
}): VisibleCard | null {
  if (input.dialogOpen) return null;
  const total = input.incoming.length + input.acceptedForMe.length;
  const first = input.incoming[0];
  if (first) return { kind: "invite", meetup: first, moreCount: total - 1 };
  const accepted = input.acceptedForMe[0];
  if (accepted) return { kind: "accepted", meetup: accepted, moreCount: total - 1 };
  return null;
}

type Play = (opts: { speak?: boolean }) => void;

function chime(play: Play): void {
  try {
    play({ speak: false });
  } catch {
    /* เสียงถูกบล็อก / ยังไม่ปลดล็อก (iOS) — การ์ดยังต้องขึ้น */
  }
}

/** เสียงปิ๊งตอนมีคำชวนใหม่ — เคารพสวิตช์เสียง (playConnext ตรวจ isSoundOn เอง) และไม่โยน error */
export function notifyInvite(play: Play = playConnext): void {
  chime(play);
}

/** เสียงปิ๊งตอนอีกฝ่ายรับคำชวน */
export function notifyAccepted(play: Play = playConnext): void {
  chime(play);
}

/** บรรทัดเหตุผลใต้ชื่อบนการ์ดคำชวน — ไม่มีโปรไฟล์ครบสองฝั่งคืน null (ไม่แสดงกล่องว่าง) */
export function inviteReason(me: User | null, other: User | undefined): string | null {
  if (!me || !other) return null;
  const reason = scoreMatch(me, other).reason.trim();
  return reason || null;
}

/** บรรทัดใต้เหตุผลบนจอฉลองหลังเชื่อมใหม่ (คำชวนเจอส่งให้อัตโนมัติ) */
export function inviteSentNote(name: string): string {
  return `ส่งคำชวนเจอแล้ว รอ ${name} ตอบ`;
}

/** ปุ่ม "ชวนเจอกันตอนนี้" บอกผลด้วย toast: ข้อความตามผล (คงที่ตามสเปก) */
export const INVITE_RESULT_TOAST = {
  sent: "ส่งคำชวนเจอแล้ว",
  existing: "มีคำชวนที่รออยู่แล้ว",
  failed: "ยังส่งคำชวนเจอไม่สำเร็จ กดชวนใหม่ได้",
} as const;

export type EntryState =
  { kind: "start"; meetup: Meetup } | { kind: "invite" } | { kind: "waiting" } | { kind: "none" };

/**
 * ปุ่มบนหน้าคู่ (/commitments, /connection/$id) ของคอนเนกชันนี้:
 * มีคำชวนที่รับแล้วและยังไม่หมดเวลา (ทั้งสองฝั่ง) → "เริ่มหากัน"; ไม่มีคำชวนที่ active → "ชวนเจอกันตอนนี้";
 * คำชวนของฉันยังรอตอบ → ข้อความ "รอ… ตอบคำชวน"; คำชวนที่รอฉันตอบ → ไม่แสดง (การ์ดด้านบนถามอยู่แล้ว)
 * คำชวนของฉันที่อีกฝ่ายกด "ไว้ทีหลัง" และยังไม่ถึงเวลาหมดอายุ → ยังแสดง "รอ… ตอบคำชวน" เหมือนรอตอบ
 * (การปฏิเสธเงียบต่อผู้ชวน และชวนซ้ำไม่ได้จนพ้นช่วงพัก — ดู `inCooldown`)
 */
export function entryState(
  meetups: readonly Meetup[],
  connectionId: string,
  meId: string | null,
  now: number,
): EntryState {
  if (!meId) return { kind: "none" };
  const active = meetups.filter((m) => m.connectionId === connectionId && isActive(m, now));
  const accepted = active.find((m) => m.status === "accepted");
  if (accepted) return { kind: "start", meetup: accepted };
  if (active.length === 0) {
    const myDeclined = meetups.some(
      (m) =>
        m.connectionId === connectionId &&
        m.inviter === meId &&
        m.status === "declined" &&
        now < Date.parse(m.expiresAt),
    );
    return myDeclined ? { kind: "waiting" } : { kind: "invite" };
  }
  return active.some((m) => m.status === "pending" && m.inviter === meId)
    ? { kind: "waiting" }
    : { kind: "none" };
}

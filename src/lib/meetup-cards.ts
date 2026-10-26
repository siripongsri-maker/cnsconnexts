/** ตรรกะล้วนของการ์ดคำชวนเจอ — เลือกการ์ดที่จะโชว์, เสียงแจ้ง, บรรทัดเหตุผล (ไม่แตะ React) */
import { scoreMatch } from "./matching";
import type { Meetup } from "./meetup-rules";
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

/** กติกาคำชวนเจอกันตอนนี้ — ฟังก์ชันล้วน ไม่แตะ React หรือ Supabase เพื่อทดสอบได้ */

export type MeetupStatus = "pending" | "accepted" | "declined" | "done" | "cancelled";

/** inviter / invitee เป็นรหัสผู้ใช้จริง ไม่ใช่ "me" */
export type Meetup = {
  id: string;
  connectionId: string;
  inviter: string;
  invitee: string;
  status: MeetupStatus;
  signalKey: string;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
};

/** คำชวนมีอายุ 30 นาที */
export const MEETUP_TTL_MS = 30 * 60_000;
/** ถามเซิร์ฟเวอร์ทุก 20 วินาทีขณะหน้าจอเปิดอยู่ */
export const POLL_MS = 20_000;
/** เว้นระยะระหว่างการกดส่งสัญญาณ */
export const PING_GAP_MS = 2_000;

/** ยังรอตอบหรือรับแล้ว และยังไม่หมดเวลา */
export function isActive(m: Meetup, now: number): boolean {
  return (m.status === "pending" || m.status === "accepted") && now < Date.parse(m.expiresAt);
}

export function canTransition(
  m: Meetup,
  actorId: string,
  to: MeetupStatus,
  now: number,
): { ok: true } | { ok: false; reason: "expired" | "not-allowed" } {
  if (now >= Date.parse(m.expiresAt)) return { ok: false, reason: "expired" };
  const allowed = (() => {
    if (m.status === "pending") {
      if (to === "accepted" || to === "declined") return actorId === m.invitee;
      if (to === "cancelled") return actorId === m.inviter;
      return false;
    }
    if (m.status === "accepted") {
      if (to === "done" || to === "cancelled") {
        return actorId === m.inviter || actorId === m.invitee;
      }
      return false;
    }
    return false;
  })();
  return allowed ? { ok: true } : { ok: false, reason: "not-allowed" };
}

/** ชวนได้เมื่อคอนเนกชันนั้นยังไม่มีคำชวนที่ active */
export function canInvite(meetups: readonly Meetup[], connectionId: string, now: number): boolean {
  return !meetups.some((m) => m.connectionId === connectionId && isActive(m, now));
}

/** คำชวนที่รอฉันตอบ เก่าสุดก่อน */
export function incomingPending(meetups: readonly Meetup[], meId: string, now: number): Meetup[] {
  return meetups
    .filter((m) => m.status === "pending" && m.invitee === meId && isActive(m, now))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/** คำชวนของฉันที่อีกฝ่ายรับแล้ว และฉันยังไม่เคยเห็น */
export function acceptedForInviter(
  meetups: readonly Meetup[],
  meId: string,
  now: number,
  seen: ReadonlySet<string>,
): Meetup[] {
  return meetups.filter(
    (m) => m.status === "accepted" && m.inviter === meId && isActive(m, now) && !seen.has(m.id),
  );
}

/** กดส่งสัญญาณได้ถ้าครั้งก่อนห่างพอ */
export function tryPing(lastAt: number | null, now: number): boolean {
  return !(lastAt !== null && now - lastAt < PING_GAP_MS);
}

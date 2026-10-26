/** กติกาของสำรับจับคู่ — ฟังก์ชันล้วน แยกจาก UI เพื่อทดสอบได้ */

/** ระยะลากขั้นต่ำ (px) ที่นับว่าปัดจริง ต่ำกว่านี้การ์ดเด้งกลับ */
export const SWIPE_THRESHOLD = 90;
/** การ์ดเอียงได้ไม่เกินกี่องศาขณะลาก */
export const MAX_TILT = 12;

export type SwipeOutcome = "skip" | "save" | "snap";
export type DeckPrimaryAction = "open-profile-sheet" | "connect" | "open-connection";
export type DeckState = "loading" | "error" | "empty" | "ready";

/** ปัดซ้าย = ข้าม · ปัดขวา = เก็บไว้ · ไม่ถึงเกณฑ์ = เด้งกลับ */
export function swipeOutcome(dx: number): SwipeOutcome {
  if (dx <= -SWIPE_THRESHOLD) return "skip";
  if (dx >= SWIPE_THRESHOLD) return "save";
  return "snap";
}

/** องศาที่การ์ดเอียงตามระยะลาก (dx/10 จำกัดที่ ±12°) */
export function swipeRotation(dx: number): number {
  return Math.min(MAX_TILT, Math.max(-MAX_TILT, dx / 10));
}

/**
 * ปุ่มหลักใต้การ์ดทำอะไร — ยังไม่มีโปรไฟล์ให้กรอกก่อน
 * เชื่อมกันแล้วเปิดคอนเนกชันเดิม (ห้ามสร้างซ้ำ) นอกนั้นขอเชื่อมต่อ
 */
export function deckPrimaryAction({
  hasProfile,
  connected,
}: {
  hasProfile: boolean;
  connected: boolean;
}): DeckPrimaryAction {
  if (!hasProfile) return "open-profile-sheet";
  if (connected) return "open-connection";
  return "connect";
}

/**
 * สถานะของสำรับ — total = จำนวนคนในสำรับทั้งหมด, remaining = ที่ยังไม่ได้ข้าม/เก็บ
 * มีการ์ดในแคชแล้วแสดงได้เลยแม้ยังโหลดไม่เสร็จ
 */
export function deckState({
  hydrated,
  networkAvailable,
  total,
  remaining,
}: {
  hydrated: boolean;
  networkAvailable: boolean;
  total: number;
  remaining: number;
}): DeckState {
  if (total === 0) {
    if (!hydrated) return "loading";
    return networkAvailable ? "empty" : "error";
  }
  return remaining === 0 ? "empty" : "ready";
}

/** ล็อกปุ่มหลังกดนานเท่าไร (ms) — ครอบช่วงการ์ดเลื่อนและฉากฉลองขึ้น กันแตะซ้ำไปโดนคนถัดไป */
export const ACTION_LOCK_MS = 300;

/**
 * กันแตะซ้ำ: ถ้ายังอยู่ในช่วงล็อก (now < lockedUntil) คืน null = ห้ามทำ
 * ไม่งั้นคืนเวลาสิ้นสุดล็อกใหม่ให้เก็บไว้
 */
export function tryAcquireLock(
  lockedUntil: number,
  now: number,
  windowMs: number = ACTION_LOCK_MS,
): number | null {
  return now < lockedUntil ? null : now + windowMs;
}

/**
 * การ์ดที่ยังรอให้ดู ตามลำดับเดิม — ตัดคนที่ดูไปแล้ว (ข้าม/เก็บไว้/เพิ่งเชื่อมต่อ)
 * ใช้ร่วมกันทั้งสำรับและตัวนับ "เหลือ N คน" บนหน้าแรก เพื่อให้ตัวเลขตรงกับการ์ดเสมอ
 * (คนที่ไม่มีชื่อถูกตัดตั้งแต่ buildDeck แล้ว)
 */
export function unseenEntries<T extends { user: { id: string } }>(
  entries: readonly T[],
  seen: readonly string[],
): T[] {
  return entries.filter((e) => !seen.includes(e.user.id));
}

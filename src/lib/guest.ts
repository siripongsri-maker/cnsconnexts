import type { User } from "./types";

/** รหัสผู้เข้าร่วมของเครื่องนี้ — คีย์เดียวกับ MY_ID_KEY ใน src/lib/store.ts */
export const PARTICIPANT_ID_KEY = "connexts-participant-id";

/**
 * ผู้เยี่ยมชมที่ยังไม่มีโปรไฟล์จริง ๆ → เห็นแถบชวนทำโปรไฟล์ และกด "ขอเชื่อมต่อ" แล้วเปิดแผ่นถาม 3 ข้อ
 *
 * มีรหัสผู้เข้าร่วมในเครื่องแต่ store ยังไม่ได้โปรไฟล์มา (กำลังโหลด หรือโหลดไม่ทัน) = คนเดิมที่กลับมา
 * ไม่ใช่ผู้เยี่ยมชม ห้ามโชว์แถบหรือเปิดแผ่นถามซ้ำ
 * `hydrated` ไม่เปลี่ยนผล: คนมาใหม่เห็นแถบได้ทันทีโดยไม่ต้องรอโหลด ส่วนคนเดิมไม่ใช่ผู้เยี่ยมชมแม้ยังโหลดไม่เสร็จ
 */
export function isGuest({
  me,
  hasLocalId,
}: {
  me: User | null;
  hasLocalId: boolean;
  hydrated: boolean;
}): boolean {
  return !me && !hasLocalId;
}

/** เครื่องนี้มีรหัสผู้เข้าร่วมเก็บไว้ไหม (อ่าน localStorage ได้เฉพาะฝั่งเบราว์เซอร์ ถูกบล็อก = ไม่มี) */
export function hasLocalParticipantId(storage?: Pick<Storage, "getItem">): boolean {
  try {
    return !!(storage ?? globalThis.localStorage)?.getItem(PARTICIPANT_ID_KEY);
  } catch {
    return false;
  }
}

/**
 * หน้าแรกควรปฏิบัติกับผู้มาเยือนแบบไหน
 * - unknown: ยังไม่ mount (อ่าน localStorage ไม่ได้) → การ์ดโครง ไม่มีแถบ ไม่เปิดแผ่นถาม
 * - guest: ไม่มีโปรไฟล์ ไม่มีรหัสในเครื่อง → การ์ดแบบผู้เยี่ยมชม + แถบชวน + เปิดแผ่นถามได้
 * - returning-loading: มีรหัสในเครื่อง store ยังโหลดไม่เสร็จ → การ์ดโครง ไม่มีแถบ ไม่เปิดแผ่นถาม
 * - returning-no-profile: มีรหัสแต่โหลดเสร็จแล้วก็ยังไม่ได้โปรไฟล์ (แถวถูกลบ/อ่านไม่สำเร็จ)
 *   → สำรับใช้สถานะของตัวเอง (ลองอีกครั้ง/การ์ดแบบผู้เยี่ยมชม) ไม่ค้างโหลดตลอดไป
 *   ไม่มีแถบชวน แต่กด "ขอเชื่อมต่อ" แล้วเปิดแผ่นถามได้เป็นทางออก
 * - member: มีโปรไฟล์แล้ว
 */
export type HomeVisitor =
  "unknown" | "guest" | "returning-loading" | "returning-no-profile" | "member";

export function homeVisitor({
  mounted,
  me,
  hasLocalId,
  hydrated,
}: {
  mounted: boolean;
  me: User | null;
  hasLocalId: boolean;
  hydrated: boolean;
}): HomeVisitor {
  if (!mounted) return "unknown";
  if (me) return "member";
  if (isGuest({ me, hasLocalId, hydrated })) return "guest";
  return hydrated ? "returning-no-profile" : "returning-loading";
}

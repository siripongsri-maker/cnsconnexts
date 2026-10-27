/**
 * ตรรกะล้วนของโหมดหากัน (spec §2, §4, §5) — ไม่แตะ React เพื่อทดสอบได้
 * - แถบแจ้งเมื่อช่องสดหลุด
 * - จังหวะการเต้นของจอ (ไม่เกิน 3 ครั้ง/วินาที ทุกกรณี)
 * - สีตัวอักษรบนพื้นสีคู่ และทิศทางการเต้น (ห่างจากสีตัวอักษรเสมอ ความคมชัดจึงไม่ลดลงระหว่างเต้น)
 */
import type { ChannelState } from "./meetup-transport";
import { contrastRatio } from "./issue-colors";
import { PING_GAP_MS } from "./meetup-rules";

/** เพดานความถี่การกะพริบ (WCAG 2.3.1) */
export const MAX_FLASH_HZ = 3;
/** เต้นความสว่างช้าๆ ขณะหากัน — 1 รอบ/วินาที (`.meadow-find-pulse`) */
export const FIND_PULSE_MS = 1_000;
/** ส่ง/รับสัญญาณ = เต้นแรง 2 รอบ รอบละ 350ms (`.meadow-find-strong`) ≈ 2.86 ครั้ง/วินาที */
export const FIND_STRONG_MS = 350;
export const FIND_STRONG_REPEATS = 2;
export const FIND_STRONG_TOTAL_MS = FIND_STRONG_MS * FIND_STRONG_REPEATS;
/** ลดการเคลื่อนไหว/เครื่องสเปกต่ำ: กรอบหนา 4px ชั่วครู่แทนการเต้น */
export const FIND_FLASH_MS = 600;

export const MSG_CHANNEL_LOST = "สัญญาณขาดหาย กำลังต่อใหม่…";

export function channelBanner(state: ChannelState): string | null {
  return state === "lost" ? MSG_CHANNEL_LOST : null;
}

/** จำนวนครั้งที่กะพริบต่อวินาที เมื่อแต่ละรอบยาว `animationMs` (1 ยอดต่อรอบ) เล่นซ้ำ `repeats` รอบ */
export function pulsesPerSecond(animationMs: number, repeats: number): number {
  if (!(animationMs > 0) || !(repeats > 0)) throw new Error("animationMs and repeats must be > 0");
  return 1_000 / animationMs;
}

/**
 * จะเริ่มเต้นแรงรอบใหม่เมื่อไร — ไม่ตัดรอบที่กำลังเล่นกลางคัน (ตัดกลางคันทำให้ยอดสองยอดชิดกันเกิน 3 Hz)
 * - ไม่มีรอบที่เล่นอยู่ → เริ่มเลย (`now`)
 * - กำลังเล่น → เริ่มต่อทันทีที่รอบเดิมจบ
 * - มีรอบที่รอคิวอยู่แล้ว → `null` (รวมเข้ากับรอบที่รอ)
 */
export function planStrongPulse(
  lastStartAt: number | null,
  pendingAt: number | null,
  now: number,
): number | null {
  if (pendingAt !== null) return null;
  if (lastStartAt === null) return now;
  const endsAt = lastStartAt + FIND_STRONG_TOTAL_MS;
  return now >= endsAt ? now : endsAt;
}

/**
 * ฝั่งรับ: สัญญาณที่มาถี่กว่า `PING_GAP_MS` จากครั้งล่าสุดที่รับไว้ ไม่เล่นเสียง/สั่น/เต้น
 * (ฝั่งส่งเว้น 2 วินาทีอยู่แล้ว แต่ช่องเป็นสาธารณะสำหรับคนที่รู้ signal_key — กันการส่งรัว)
 * นาฬิกาถอยหลัง (now < lastAt) ถือว่ารับได้ ไม่ล็อกสัญญาณค้าง
 */
export function acceptReceivedPing(lastAcceptedAt: number | null, now: number): boolean {
  if (lastAcceptedAt === null || now < lastAcceptedAt) return true;
  return now - lastAcceptedAt >= PING_GAP_MS;
}

/** คูณช่องสี sRGB ด้วย `factor` (แบบ CSS `brightness()`) แล้วตัดที่ 0–255 */
export function scaleHex(hex: string, factor: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const out = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v * factor))),
  );
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export type FindColors = {
  /** พื้นจอ (สีของคู่) */
  bg: string;
  /** ตัวอักษร สัญลักษณ์ และปุ่มบนพื้นสี — คู่สีจาก BLOCK_TAG (ผ่าน 4.5:1 ทุกสี) */
  fg: string;
  /** ค่า `brightness()` ที่ยอดของการเต้นช้า / เต้นแรง: ตัวอักษรขาว → มืดลง, ตัวอักษรเข้ม → สว่างขึ้น */
  pulsePeak: number;
  strongPeak: number;
};

export function findColors(badge: { bg: string; fg: string }): FindColors {
  const fgIsLight = contrastRatio(badge.fg, "#000000") > contrastRatio(badge.fg, "#FFFFFF");
  return fgIsLight
    ? { bg: badge.bg, fg: badge.fg, pulsePeak: 0.82, strongPeak: 0.55 }
    : { bg: badge.bg, fg: badge.fg, pulsePeak: 1.15, strongPeak: 1.35 };
}

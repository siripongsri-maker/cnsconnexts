/**
 * หน้าที่ไม่ใช้ธีมทุ่งจับคู่ (คงหน้าตาเดิม):
 * - /print ชุดไฟล์พิมพ์ A0/A4 (ธีมนี้ขยายตัวหนังสือเล็กเป็น 20px ทำให้หน้าพิมพ์ล้น)
 * - /journey และ /brand-preview เอกสารภายในทีมงาน
 */
const NON_MEADOW_PREFIXES = ["/print", "/journey", "/brand-preview"] as const;

/** หลังบ้านใช้ธีมทุ่งเดียวกับผู้เข้าร่วม แต่เพิ่มชั้น "meadow-work" ให้ตัวอักษรและปุ่มกระชับขึ้นสำหรับงานหลังบ้าน */
const WORK_PREFIX = "/admin";

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * ธีม "ทุ่งจับคู่" (Meadow) ใช้กับทุกหน้า ยกเว้นหน้าใน NON_MEADOW_PREFIXES
 * (ตรงทั้งเส้นทางหรือเส้นทางย่อยเท่านั้น เช่น /printer ยังเป็นหน้าผู้เข้าร่วม)
 * - หน้าผู้เข้าร่วม → "meadow"
 * - /admin → "meadow meadow-work" (ธีมเดียวกัน ขนาดตัวอักษรกระชับกว่า ดู src/meadow.css)
 * ใส่คลาสนี้ที่ <html> ตั้งแต่ฝั่งเซิร์ฟเวอร์ เพื่อให้ portal (Drawer, Toaster) ได้สีของธีมตั้งแต่แรกโดยไม่กะพริบ
 */
export function themeClassFor(pathname: string): "meadow" | "meadow meadow-work" | undefined {
  if (matchesPrefix(pathname, WORK_PREFIX)) return "meadow meadow-work";
  if (NON_MEADOW_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) return undefined;
  return "meadow";
}

/**
 * หน้าของผู้เข้าร่วมจริง ๆ (ธีม "meadow" ล้วน) — หลังบ้าน/หน้าพิมพ์/เอกสารภายในไม่ใช่
 * ใช้เป็นตัวกั้นงานเครือข่ายและ UI ที่มีไว้ให้ผู้เข้าร่วมเท่านั้น (คำชวนเจอ โหมดหากัน)
 */
export function isParticipantRoute(pathname: string): boolean {
  const themeClass = themeClassFor(pathname);
  return themeClass === "meadow";
}

/**
 * หน้าที่ไม่ใช้ธีมทุ่งจับคู่ (คงหน้าตาเดิม):
 * - /admin หลังบ้าน
 * - /print ชุดไฟล์พิมพ์ A0/A4 (ธีมนี้ขยายตัวหนังสือเล็กเป็น 20px ทำให้หน้าพิมพ์ล้น)
 * - /journey และ /brand-preview เอกสารภายในทีมงาน
 */
const NON_MEADOW_PREFIXES = ["/admin", "/print", "/journey", "/brand-preview"] as const;

/**
 * ธีม "ทุ่งจับคู่" (Meadow) ใช้กับทุกหน้าของผู้เข้าร่วม ยกเว้นหน้าใน NON_MEADOW_PREFIXES
 * (ตรงทั้งเส้นทางหรือเส้นทางย่อยเท่านั้น เช่น /printer ยังเป็นหน้าผู้เข้าร่วม)
 * ใส่คลาสนี้ที่ <html> ตั้งแต่ฝั่งเซิร์ฟเวอร์ เพื่อให้ portal (Drawer, Toaster) ได้สีของธีมตั้งแต่แรกโดยไม่กะพริบ
 */
export function themeClassFor(pathname: string): "meadow" | undefined {
  const excluded = NON_MEADOW_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return excluded ? undefined : "meadow";
}

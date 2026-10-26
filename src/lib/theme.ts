/**
 * ธีม "ทุ่งจับคู่" (Meadow) ใช้กับทุกหน้าของผู้เข้าร่วม ยกเว้นหลังบ้าน /admin
 * ที่ยังคงหน้าตาเดิม — ใส่คลาสนี้ที่ <html> ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * เพื่อให้ portal (Drawer, Toaster) ได้สีของธีมตั้งแต่แรกโดยไม่กะพริบ
 */
export function themeClassFor(pathname: string): "meadow" | undefined {
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  return isAdmin ? undefined : "meadow";
}

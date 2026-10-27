import { z } from "zod";

/**
 * โหมดจอใหญ่ของ /dashboard: `?present=1` ที่พิมพ์เองถูกอ่านเป็นตัวเลข 1 ส่วนลิงก์ในแอปเขียนเป็น "1"
 * รับทั้งสองแบบแล้วคืนค่าเป็น "1" เสมอ (ค่าอื่นคือไม่เปิดโหมด)
 */
export const presentParam = z
  .union([z.literal(1), z.literal("1")])
  .transform(() => "1" as const)
  .optional()
  .catch(undefined);

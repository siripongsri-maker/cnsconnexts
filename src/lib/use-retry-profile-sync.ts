import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { useStore } from "./store";

/** ข้อความเมื่อโปรไฟล์ยังค้างส่ง — ใช้ทั้งบนปุ่มหลักของสำรับ/หน้าโปรไฟล์ และ toast ตอนส่งไม่ผ่าน */
export const PROFILE_SYNC_FAILED = "ยังบันทึกโปรไฟล์ไม่สำเร็จ ลองส่งอีกครั้ง";

/**
 * ลองส่งโปรไฟล์ที่ค้างอยู่ในเครื่องขึ้นฐานข้อมูลอีกครั้ง (แทนการขอเชื่อมต่อ ระหว่างโปรไฟล์ยังไม่ขึ้นระบบ)
 * กดซ้ำระหว่างส่งไม่มีผล · แจ้งผลด้วย toast · คืน true เมื่อส่งสำเร็จ
 */
export function useRetryProfileSync() {
  const { syncPendingProfile } = useStore();
  const [retrying, setRetrying] = useState(false);
  const busy = useRef(false);

  const retry = useCallback(async (): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setRetrying(true);
    try {
      await syncPendingProfile();
      toast.success("บันทึกโปรไฟล์แล้ว ขอเชื่อมต่อได้เลย", { id: "profile-sync" });
      return true;
    } catch (err) {
      console.error("[connexts] ส่งโปรไฟล์ซ้ำไม่สำเร็จ", err);
      toast.error(PROFILE_SYNC_FAILED, { id: "profile-sync" });
      return false;
    } finally {
      busy.current = false;
      setRetrying(false);
    }
  }, [syncPendingProfile]);

  return { retrying, retry };
}

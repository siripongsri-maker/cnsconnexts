import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

import { MeadowScene } from "@/components/meadow-scene";

const SLOW_AFTER_MS = 8000;

/**
 * หน้าโหลดก่อนข้อมูลพร้อม (ก่อนทุกหน้า) — ฉากทุ่งหญ้าโทนสว่าง ข้อความ 20px ขึ้นไป
 * สีกำหนดตรง ๆ ไม่พึ่งตัวแปรธีม เพราะบางครั้งขึ้นก่อนหน้าหลังบ้าน (ไม่มีคลาส meadow) ด้วย
 * ใบพัดหมุนด้วย CSS ใน meadow.css และหยุดเองเมื่อผู้ใช้ลดการเคลื่อนไหว/เครื่องสเปกต่ำ
 */
export function LoadingScreen({ message = "กำลังโหลด…" }: { message?: string }) {
  const [slow, setSlow] = useState(false);

  // เน็ตช้าเกิน 8 วินาที → บอกให้รู้ และมีปุ่มลองใหม่ ไม่ปล่อยให้รอเงียบ ๆ
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-[linear-gradient(#EAF6FD,#FFFDF8)] px-6 py-10 text-center text-[#2B2878]"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-[#E6E3F2] bg-white shadow-[0_8px_24px_-12px_rgba(43,40,120,0.25)]">
        <MeadowScene variant="empty" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <img
          src="/brand/cns-mark-transparent.svg"
          alt=""
          aria-hidden
          width={512}
          height={512}
          className="h-12 w-12 object-contain"
        />
        <p className="font-heading text-title font-semibold text-[#2B2878]">{message}</p>
        <p className="text-body text-[#4A4870]">เชื่อมคน · เชื่อมไอเดีย · เชื่อมพื้นที่</p>
      </div>
      {slow && (
        <div className="flex max-w-sm flex-col items-center gap-3">
          <p className="text-body text-[#4A4870]">ใช้เวลานานกว่าปกติ ลองโหลดอีกครั้งได้</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="tap inline-flex min-h-14 items-center justify-center gap-2 rounded-[18px] border-2 border-[#2B2878] bg-white px-6 text-body font-semibold text-[#2B2878]"
          >
            <RotateCw className="h-6 w-6" aria-hidden /> โหลดอีกครั้ง
          </button>
        </div>
      )}
    </div>
  );
}

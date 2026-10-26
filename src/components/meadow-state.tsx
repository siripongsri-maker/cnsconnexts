import type { ReactNode } from "react";

import { MeadowScene } from "@/components/meadow-scene";

/** ปุ่มหลัก/รองในหน้าสถานะ — สีกำหนดตรง ๆ เพราะ 404/ข้อผิดพลาดอาจขึ้นในหน้าหลังบ้าน (ไม่มีธีมทุ่ง) ด้วย */
export const STATE_PRIMARY =
  "tap inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-[18px] bg-[#6A2C91] px-6 text-center font-heading text-lead font-semibold text-white";
export const STATE_SECONDARY =
  "tap inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] border-2 border-[#2B2878] bg-white px-5 text-center text-body font-semibold text-[#2B2878]";

/**
 * หน้าสถานะเต็มจอ (กำลังเปิด / ไม่พบ / ข้อผิดพลาด) ของหน้าผู้เข้าร่วม — การ์ดสว่างพร้อมฉากทุ่งหญ้า
 * ตัวอักษร 20px ขึ้นไป ปุ่มสูง ≥ 56px
 */
export function MeadowState({
  title,
  description,
  loading = false,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** true = กำลังโหลด (แจ้งเครื่องอ่านหน้าจอแบบ status) */
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-4 py-10"
    >
      <div
        role={loading ? "status" : undefined}
        className="overflow-hidden rounded-3xl border border-[#E6E3F2] bg-white text-center text-[#2B2878] shadow-[0_8px_24px_-12px_rgba(43,40,120,0.25)]"
      >
        <MeadowScene variant="empty" />
        <div className="flex flex-col items-center gap-3 p-6">
          <h1 className="font-heading text-title font-semibold text-[#2B2878] [overflow-wrap:anywhere]">
            {title}
          </h1>
          {description && <p className="text-body text-[#4A4870]">{description}</p>}
          {children && <div className="mt-2 flex w-full flex-col gap-3">{children}</div>}
        </div>
      </div>
    </main>
  );
}

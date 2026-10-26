import { useState } from "react";

import { useConsent } from "@/lib/usage-log";

/**
 * แถบขอความยินยอมเก็บสถิติ (PDPA) — แสดงบนหน้าแรกจนกว่าจะเลือก
 * วางตามลำดับหน้า (ใต้แถบหัว เหนือสำรับ) ไม่ลอย จึงไม่บังแถบปุ่มของสำรับที่ลอยเหนือเมนูล่าง
 * ข้อความเดียว + ปุ่ม 2 ปุ่ม (สูง ≥ 48px) + ปุ่มดูรายละเอียด ตัวอักษรทุกชิ้น ≥ 20px
 */
export function PdpaConsent() {
  const { ready, consent, decide } = useConsent();
  const [open, setOpen] = useState(false);

  if (!ready || consent) return null;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4">
      <section
        aria-label="ขอความยินยอมเก็บสถิติการใช้งาน"
        className="meadow-card bg-sky-soft p-4 max-[359px]:p-3"
      >
        <p className="text-body font-semibold text-ink">
          ขอเก็บหน้าและปุ่มที่คุณใช้ในเครื่องนี้ได้ไหม ไม่เก็บชื่อหรือเบอร์ติดต่อ
          เปลี่ยนใจได้ทุกเมื่อ
        </p>

        <ul
          id="pdpa-details"
          hidden={!open}
          className="mt-2 list-disc space-y-1 pl-6 text-body text-ink-soft"
        >
          <li>ข้อมูลที่เก็บ: รหัสผู้เยี่ยมชมแบบสุ่ม, เส้นทางหน้า, ประเภทเหตุการณ์, เวลา</li>
          <li>วัตถุประสงค์: วิเคราะห์การใช้งานและรายงานผลกิจกรรมแบบไม่ระบุตัวตน</li>
          <li>ระยะเวลา: เก็บสูงสุด 1,000 รายการล่าสุด และลบทันทีเมื่อคุณไม่ยินยอม</li>
          <li>สิทธิของคุณ: ขอดู แก้ไข หรือลบข้อมูลได้ที่ทีมผู้จัดงาน</li>
        </ul>

        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="tap min-h-12 flex-1 rounded-xl bg-primary px-3 text-body font-semibold text-primary-foreground"
          >
            ได้เลย
          </button>
          <button
            type="button"
            onClick={() => decide("declined")}
            className="tap min-h-12 flex-1 rounded-xl border-2 border-ink bg-white px-3 text-body font-semibold text-ink"
          >
            ไม่เป็นไร
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="pdpa-details"
          className="tap mt-1 inline-flex min-h-12 items-center rounded-xl text-body font-semibold text-primary underline underline-offset-4"
        >
          {open ? "ย่อรายละเอียด" : "รายละเอียด"}
        </button>
      </section>
    </div>
  );
}

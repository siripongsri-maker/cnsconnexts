import { useEffect, useRef, useState } from "react";

import { useConsent } from "@/lib/usage-log";
import { BOTTOM_NAV_HEIGHT_VAR } from "./bottom-nav";

/**
 * ความสูงจริงของแถบ PDPA (px) เป็นตัวแปร CSS ที่ <html> — ค่าเริ่มต้น 0px เมื่อไม่แสดงแถบ
 * ของที่ลอยเหนือเมนูล่าง (แถบปุ่มของสำรับ) และระยะท้ายหน้าบวกค่านี้เพิ่ม จึงไม่ถูกแถบบัง
 */
export const PDPA_HEIGHT_VAR = "--pdpa-height";

/**
 * แถบขอความยินยอมเก็บสถิติ (PDPA) — ลอยชิดขอบบนของเมนูล่าง แสดงบนหน้าแรกจนกว่าจะเลือก
 * ข้อความสั้น + ปุ่ม "ได้เลย" / "ไม่เป็นไร" + "รายละเอียด" (ขยายขึ้นด้านบน) ตัวอักษรทุกชิ้น ≥ 20px ปุ่มสูง ≥ 48px
 */
export function PdpaConsent() {
  const { ready, consent, decide } = useConsent();
  if (!ready || consent) return null;
  return <PdpaBar decide={decide} />;
}

function PdpaBar({ decide }: { decide: (v: "accepted" | "declined") => void }) {
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // ยกแถบปุ่มของสำรับขึ้นเหนือแถบนี้ — วัดความสูงจริง (ขยายรายละเอียด/ขยายตัวอักษรก็ตามทัน)
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty(PDPA_HEIGHT_VAR, `${bar.offsetHeight}px`);
    publish();
    if (typeof ResizeObserver === "undefined")
      return () => root.style.setProperty(PDPA_HEIGHT_VAR, "0px");
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.setProperty(PDPA_HEIGHT_VAR, "0px");
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 z-40"
      style={{ bottom: `var(${BOTTOM_NAV_HEIGHT_VAR}, calc(77px + env(safe-area-inset-bottom)))` }}
    >
      <section
        aria-label="ขอความยินยอมเก็บสถิติการใช้งาน"
        className="mx-auto max-h-[60dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-b-0 border-[#E6E3F2] bg-sky-soft px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(43,40,120,0.25)]"
      >
        <p className="text-body font-semibold text-ink">
          ขอเก็บสถิติการใช้งานได้ไหม ไม่เก็บชื่อหรือเบอร์ติดต่อ
        </p>

        <ul
          id="pdpa-details"
          hidden={!open}
          className="mt-1 list-disc space-y-1 pl-6 text-body text-ink-soft"
        >
          <li>ข้อมูลที่เก็บ: รหัสผู้เยี่ยมชมแบบสุ่ม, เส้นทางหน้า, ประเภทเหตุการณ์, เวลา</li>
          <li>วัตถุประสงค์: วิเคราะห์การใช้งานและรายงานผลกิจกรรมแบบไม่ระบุตัวตน</li>
          <li>ระยะเวลา: เก็บสูงสุด 1,000 รายการล่าสุด และลบทันทีเมื่อคุณไม่ยินยอม</li>
          <li>สิทธิของคุณ: ขอดู แก้ไข หรือลบข้อมูลได้ที่ทีมผู้จัดงาน เปลี่ยนใจได้ทุกเมื่อ</li>
        </ul>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="tap min-h-12 rounded-xl bg-primary px-4 text-body font-semibold text-primary-foreground"
          >
            ได้เลย
          </button>
          <button
            type="button"
            onClick={() => decide("declined")}
            className="tap min-h-12 rounded-xl border-2 border-ink bg-white px-3 text-body font-semibold text-ink"
          >
            ไม่เป็นไร
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="pdpa-details"
            className="tap inline-flex min-h-12 items-center rounded-xl px-2 text-body font-semibold text-primary underline underline-offset-4"
          >
            {open ? "ย่อรายละเอียด" : "รายละเอียด"}
          </button>
        </div>
      </section>
    </div>
  );
}

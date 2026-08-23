import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

import { useConsent } from "@/lib/usage-log";

/** PDPA notice + consent buttons shown on the homepage until a choice is made. */
export function PdpaConsent() {
  const { ready, consent, decide } = useConsent();
  const [open, setOpen] = useState(false);

  if (!ready || consent) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="card-soft mx-auto max-w-xl rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-extrabold">การเก็บข้อมูลการใช้งาน (PDPA)</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              เว็บนี้เก็บบันทึกการใช้งาน เช่น หน้าที่เข้าชม เวลา และการกดใช้ฟีเจอร์
              เพื่อปรับปรุงบริการและสรุปภาพรวมกิจกรรม ข้อมูลถูกเก็บในเครื่องของคุณ
              ไม่มีการเก็บชื่อ-นามสกุลหรือข้อมูลติดต่อในบันทึกนี้ และคุณถอนความยินยอมได้ทุกเมื่อ
            </p>

            {open && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                <li>ข้อมูลที่เก็บ: รหัสผู้เยี่ยมชมแบบสุ่ม, เส้นทางหน้า, ประเภทเหตุการณ์, เวลา</li>
                <li>วัตถุประสงค์: วิเคราะห์การใช้งานและรายงานผลกิจกรรมแบบไม่ระบุตัวตน</li>
                <li>ระยะเวลา: เก็บสูงสุด 1,000 รายการล่าสุด และลบทันทีเมื่อคุณไม่ยินยอม</li>
                <li>สิทธิของคุณ: ขอดู แก้ไข หรือลบข้อมูลได้ที่ทีมผู้จัดงาน</li>
              </ul>
            )}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1.5 text-[11px] font-extrabold text-primary"
            >
              {open ? "ย่อรายละเอียด" : "อ่านรายละเอียดการเก็บข้อมูล"}
            </button>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => decide("accepted")}
                className="rounded-xl bg-primary px-4 py-2 text-[12px] font-extrabold text-primary-foreground"
              >
                ยินยอมให้เก็บข้อมูล
              </button>
              <button
                type="button"
                onClick={() => decide("declined")}
                className="rounded-xl border border-border px-4 py-2 text-[12px] font-extrabold"
              >
                ไม่ยินยอม
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="ปิดและไม่ยินยอม"
            onClick={() => decide("declined")}
            className="ml-auto shrink-0 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

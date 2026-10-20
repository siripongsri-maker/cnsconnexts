import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

import { useConsent } from "@/lib/usage-log";

/** PDPA notice + consent buttons shown on the homepage until a choice is made. */
export function PdpaConsent() {
  const { ready, consent, decide } = useConsent();
  const [open, setOpen] = useState(false);

  if (!ready || consent) return null;

  return (
    <div
      role="region"
      aria-labelledby="pdpa-title"
      className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 px-3"
    >
      <div className="card-soft mx-auto max-w-xl max-h-[60vh] overflow-y-auto rounded-none border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center bg-primary/12 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="pdpa-title" className="text-[14px] font-extrabold">
              ยินยอมเก็บสถิติการใช้งาน?
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              เก็บหน้าและปุ่มที่ใช้งานในเครื่องนี้ ไม่เก็บชื่อหรือเบอร์ติดต่อ เปลี่ยนใจได้ทุกเมื่อ
            </p>

            <ul
              id="pdpa-details"
              hidden={!open}
              className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground"
            >
              <li>ข้อมูลที่เก็บ: รหัสผู้เยี่ยมชมแบบสุ่ม, เส้นทางหน้า, ประเภทเหตุการณ์, เวลา</li>
              <li>วัตถุประสงค์: วิเคราะห์การใช้งานและรายงานผลกิจกรรมแบบไม่ระบุตัวตน</li>
              <li>ระยะเวลา: เก็บสูงสุด 1,000 รายการล่าสุด และลบทันทีเมื่อคุณไม่ยินยอม</li>
              <li>สิทธิของคุณ: ขอดู แก้ไข หรือลบข้อมูลได้ที่ทีมผู้จัดงาน</li>
            </ul>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="pdpa-details"
              className="tap mt-1 inline-flex min-h-11 items-center text-xs font-extrabold text-primary"
            >
              {open ? "ย่อรายละเอียด" : "รายละเอียด"}
            </button>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => decide("accepted")}
                className="tap h-11 flex-1 bg-primary px-3 text-sm font-extrabold text-primary-foreground"
              >
                ยินยอม
              </button>
              <button
                type="button"
                onClick={() => decide("declined")}
                className="tap h-11 flex-1 border border-border bg-card px-3 text-sm font-extrabold text-foreground"
              >
                ไม่ยินยอม
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="ปิดและไม่ยินยอม"
            onClick={() => decide("declined")}
            className="tap -mr-2 -mt-2 ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

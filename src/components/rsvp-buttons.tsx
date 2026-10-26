import { Check, Clock3, X } from "lucide-react";

import { RSVP_TH, type Commitment } from "@/lib/types";
import { useStore } from "@/lib/store";

const BASE =
  "tap inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 py-1 text-body font-semibold";
const OFF = "border-[#C9C6E0] bg-white text-ink";

/** ปุ่มตอบรับ / ปฏิเสธนัดหมายของคำมั่นสัญญา (RSVP) — ตัวอักษร 20px ปุ่มสูง ≥ 48px */
export function RsvpButtons({ m, compact = false }: { m: Commitment; compact?: boolean }) {
  const { setRsvp } = useStore();
  const current = m.rsvp ?? "pending";

  return (
    <div className="mt-3">
      {!compact && <p className="mb-2 text-body font-semibold text-ink">ตอบรับนัด:</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={current === "accepted"}
          onClick={() => setRsvp(m.id, "accepted")}
          className={`${BASE} ${current === "accepted" ? "border-primary bg-primary text-white" : OFF}`}
        >
          <Check className="h-5 w-5 shrink-0" aria-hidden="true" /> สะดวก
        </button>
        <button
          type="button"
          aria-pressed={current === "declined"}
          onClick={() => setRsvp(m.id, "declined")}
          className={`${BASE} ${current === "declined" ? "border-[#B3261E] bg-[#B3261E] text-white" : OFF}`}
        >
          <X className="h-5 w-5 shrink-0" aria-hidden="true" /> ไม่สะดวก
        </button>
        {current === "pending" && (
          <span className="inline-flex min-h-12 items-center gap-2 text-body font-semibold text-ink-soft">
            <Clock3 className="h-5 w-5 shrink-0" aria-hidden="true" /> รอตอบรับ
          </span>
        )}
      </div>
      {m.partner_rsvp && (
        <p className="mt-2 text-body text-ink-soft">อีกฝ่าย: {RSVP_TH[m.partner_rsvp]}</p>
      )}
    </div>
  );
}

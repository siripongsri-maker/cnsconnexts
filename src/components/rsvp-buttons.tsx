import { Check, Clock3, X } from "lucide-react";

import { RSVP_TH, type Commitment } from "@/lib/types";
import { useStore } from "@/lib/store";

/** ปุ่มตอบรับ / ปฏิเสธนัดหมายของคำมั่นสัญญา (RSVP) */
export function RsvpButtons({ m, compact = false }: { m: Commitment; compact?: boolean }) {
  const { setRsvp } = useStore();
  const current = m.rsvp ?? "pending";

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {!compact && (
          <span className="text-xs font-bold text-muted-foreground">ตอบรับนัด:</span>
        )}
        <button
          type="button"
          onClick={() => setRsvp(m.id, "accepted")}
          className={`tap inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            current === "accepted"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground"
          }`}
        >
          <Check className="h-3 w-3" /> สะดวก
        </button>
        <button
          type="button"
          onClick={() => setRsvp(m.id, "declined")}
          className={`tap inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            current === "declined"
              ? "bg-destructive text-destructive-foreground"
              : "bg-background text-muted-foreground"
          }`}
        >
          <X className="h-3 w-3" /> ไม่สะดวก
        </button>
        {current === "pending" && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Clock3 className="h-3 w-3" /> รอตอบรับ
          </span>
        )}
      </div>
      {m.partner_rsvp && (
        <p className="mt-1 text-xs text-muted-foreground">
          อีกฝ่าย: {RSVP_TH[m.partner_rsvp]}
        </p>
      )}
    </div>
  );
}

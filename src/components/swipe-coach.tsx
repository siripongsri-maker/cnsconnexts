import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Hand, X } from "lucide-react";

const KEY = "connexts-swipe-coach-v1";

/** แนะนำวิธีปัดการ์ดครั้งแรก (แก้ปัญหา "งงว่าปัดซ้ายปัดขวาคืออะไร") */
export function SwipeCoach() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!open) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-6 backdrop-blur-sm">
      <div className="card-soft w-full max-w-sm rounded-3xl bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              วิธีใช้การ์ดนี้
            </p>
            <h2 className="mt-0.5 text-[19px] font-extrabold">ปัดการ์ดยังไง?</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="ปิด"
            className="tap grid h-9 w-9 place-items-center rounded-full bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid place-items-center rounded-2xl bg-muted/60 py-6">
          <Hand className="h-9 w-9 animate-swipe-hint text-primary" />
        </div>

        <ul className="mt-4 space-y-2.5 text-[15px] font-semibold">
          <li className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/8 p-3">
            <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
            ลากการ์ดไป <span className="text-primary">ทางขวา = สนใจ</span>
          </li>
          <li className="flex items-center gap-2.5 rounded-2xl border border-border p-3">
            <ArrowLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
            ลากการ์ดไป <span className="text-muted-foreground">ทางซ้าย = ข้าม</span>
          </li>
        </ul>

        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          ไม่ถนัดปัดก็ไม่เป็นไร — ใต้การ์ดมีปุ่มใหญ่ <b>ข้าม</b> · <b>ขอเชื่อมต่อ</b> · <b>สนใจ</b>
          หรือกดปุ่ม “รายการ” ด้านบนเพื่อดูเป็นรายชื่อแทน
        </p>

        <button
          type="button"
          onClick={close}
          className="tap mt-4 flex h-13 w-full items-center justify-center rounded-2xl gradient-power py-3.5 text-[15px] font-extrabold text-primary-foreground"
        >
          เข้าใจแล้ว เริ่มเลย
        </button>
      </div>
    </div>
  );
}

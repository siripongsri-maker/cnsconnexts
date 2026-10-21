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

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="swipe-coach-title"
      aria-describedby="swipe-coach-desc"
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-6 backdrop-blur-sm"
    >
      <div className="core-swipe-coach card-soft w-full max-w-sm rounded-3xl bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted-foreground">DISCOVER / QUICK GUIDE</p>
            <h2 id="swipe-coach-title" className="mt-0.5 text-[19px] font-extrabold">
              เจอคนที่ใช่ ในหนึ่งปัด
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="ปิด"
            className="tap grid h-11 w-11 place-items-center rounded-full bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid place-items-center rounded-2xl bg-muted/60 py-6">
          <Hand className="h-9 w-9 animate-swipe-hint text-primary" aria-hidden />
        </div>

        <ul className="mt-4 space-y-2.5 text-[15px] font-semibold">
          <li className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/8 p-3">
            <ArrowRight className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="text-primary">ปัดขวา</span> เก็บไว้ในคนที่สนใจ
          </li>
          <li className="flex items-center gap-2.5 rounded-2xl border border-border p-3">
            <ArrowLeft className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">ปัดซ้าย</span> ดูคนต่อไป
          </li>
        </ul>

        <p
          id="swipe-coach-desc"
          className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground"
        >
          ใช้ปุ่มใต้การ์ดได้เช่นกัน หรือเลือก “รายการ” เพื่อดูทุกคน
        </p>

        <button
          type="button"
          onClick={close}
          autoFocus
          className="tap mt-4 flex h-13 w-full items-center justify-center rounded-2xl bg-primary py-3.5 text-[15px] font-extrabold text-primary-foreground"
        >
          เข้าใจแล้ว เริ่มเลย
        </button>
      </div>
    </div>
  );
}

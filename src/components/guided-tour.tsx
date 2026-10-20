/**
 * ทัวร์แนะนำการใช้งานสำหรับผู้ใช้ครั้งแรก
 * - แสดงอัตโนมัติครั้งเดียว (จำสถานะไว้ใน localStorage)
 * - เปิดซ้ำได้ด้วย window.dispatchEvent(new Event(TOUR_EVENT))
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Handshake, Sparkles, UserPlus, X } from "lucide-react";

export const TOUR_EVENT = "connexts:start-tour";
const KEY = "connext-tour-seen";
const HIDDEN_PREFIXES = ["/admin", "/print", "/journey", "/qr", "/brand-preview"];

type Step = {
  icon: typeof Sparkles;
  title: string;
  body: string;
  tip: string;
  to: string;
  cta: string;
};

const STEPS: Step[] = [
  {
    icon: UserPlus,
    title: "1 · สร้าง Power Profile",
    body: "เริ่มจากกรอกชื่อ จังหวัด ประเด็นที่สนใจ และบอกว่าคุณ “มีอะไร” กับ “ต้องการอะไร” ใช้เวลาไม่ถึง 2 นาที",
    tip: "ยิ่งใส่ครบ ระบบยิ่งจับคู่แม่น เพราะคะแนนแมตช์ให้น้ำหนัก มี/ต้องการ มากที่สุด",
    to: "/onboarding",
    cta: "ไปกรอกโปรไฟล์",
  },
  {
    icon: Compass,
    title: "2 · ค้นหาคู่เชื่อม",
    body: "หน้า “คู่เชื่อม” จะเรียงคนที่เข้ากับคุณมากที่สุด พร้อมบอกเหตุผลสั้น ๆ ว่าทำไมถึงแมตช์",
    tip: "ปัดการ์ดขวาเพื่อสนใจ ปัดซ้ายเพื่อข้าม หรือกรองตามภาค/ประเด็นได้",
    to: "/matches",
    cta: "ดูคู่เชื่อมของฉัน",
  },
  {
    icon: Handshake,
    title: "3 · ส่งคำขอเชื่อม",
    body: "กด “ขอเชื่อม” แล้วอีกฝ่ายจะได้รับแจ้งเตือนทันที เมื่อตอบรับจะเปิดห้องคุยให้คุยต่อได้เลย",
    tip: "เปิดหน้าตลาดนัดไอเดียเพื่อหาเรื่องคุยเปิดบทสนทนา",
    to: "/marketplace",
    cta: "ดูตลาดนัดไอเดีย",
  },
  {
    icon: CheckCircle2,
    title: "4 · ตั้งคำมั่นและวันนัด",
    body: "ทุกการเชื่อมควรจบด้วยก้าวต่อไปที่จับต้องได้ ระบุสิ่งที่จะทำ ใครรับผิดชอบ และนัดวันติดตามผล",
    tip: "ส่งออกวันนัดเข้าปฏิทินได้ พร้อมรับการเตือนก่อนถึงเวลา",
    to: "/commitments",
    cta: "ไปตั้งก้าวต่อไป",
  },
  {
    icon: Sparkles,
    title: "พร้อมแล้ว!",
    body: "ติดตามภาพรวมงานแบบสด ๆ ได้ที่หน้า “สด” ทั้งจำนวนคู่เชื่อม คำมั่น และความคืบหน้าของทั้งงาน",
    tip: "เปิดทัวร์นี้อีกครั้งได้จากเมนูหน้าแรก",
    to: "/dashboard",
    cta: "ดูภาพรวมสด",
  },
];

export function GuidedTour() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hidden) return;
    let seen = true;
    try {
      seen = window.localStorage.getItem(KEY) === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [hidden]);

  useEffect(() => {
    const handler = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener(TOUR_EVENT, handler);
    return () => window.removeEventListener(TOUR_EVENT, handler);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setI(0);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const step = STEPS[i];
  if (!open || hidden || !step) return null;
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ทัวร์แนะนำการใช้งาน"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/60 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="card-soft w-full max-w-md rounded-3xl bg-card p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              ทัวร์แนะนำการใช้งาน
            </p>
            <h2 className="break-words text-[17px] font-extrabold leading-tight">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="ปิดทัวร์แนะนำ"
            className="tap grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/90">{step.body}</p>
        <p className="mt-2 rounded-2xl bg-accent px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          เคล็ดลับ: {step.tip}
        </p>

        <Link
          to={step.to}
          onClick={close}
          className="tap mt-3 flex h-11 items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground"
        >
          {step.cta}
        </Link>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
            {STEPS.map((s, idx) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-5 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI((v) => v - 1)}
              className="tap inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[12px] font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> ก่อนหน้า
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? close() : setI((v) => v + 1))}
            className="tap inline-flex items-center gap-1 rounded-xl bg-foreground px-3 py-2 text-[12px] font-bold text-background"
          >
            {last ? "เริ่มใช้งาน" : "ถัดไป"}
            {!last && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>

        {!last && (
          <button
            type="button"
            onClick={close}
            className="mt-2 w-full text-center text-[12px] font-bold text-muted-foreground"
          >
            ข้ามทัวร์นี้
          </button>
        )}
      </div>
    </div>
  );
}

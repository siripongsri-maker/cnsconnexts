/**
 * ทัวร์แนะนำการใช้งานสำหรับผู้ใช้ครั้งแรก
 * - แสดงอัตโนมัติครั้งเดียว เมื่อมาถึงหน้า /matches ครั้งแรกหลังมีโปรไฟล์แล้ว (จำสถานะไว้ใน localStorage)
 *   ไม่เด้งขึ้นบนหน้าแรก /scan /join /start /onboarding เพื่อไม่ซ้อนกับ PDPA และ IntroGuide
 * - เปิดซ้ำได้ด้วย window.dispatchEvent(new Event(TOUR_EVENT))
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Handshake, Sparkles, UserPlus, X } from "lucide-react";

import { useStore } from "@/lib/store";

export const TOUR_EVENT = "connexts:start-tour";
const KEY = "connext-tour-seen";
const HIDDEN_PREFIXES = ["/admin", "/print", "/journey", "/qr", "/brand-preview"];
/** หน้าเดียวที่ทัวร์เปิดเองได้ (ครั้งแรก หลังสร้างโปรไฟล์แล้ว) */
const AUTO_OPEN_PATH = "/matches";

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
    title: "สร้าง Power Profile",
    body: "เริ่มจากกรอกชื่อ จังหวัด ประเด็นที่สนใจ และบอกว่าคุณ “มีอะไร” กับ “ต้องการอะไร” ใช้เวลาไม่ถึง 2 นาที",
    tip: "ยิ่งใส่ครบ ระบบยิ่งจับคู่แม่น เพราะคะแนนแมตช์ให้น้ำหนัก มี/ต้องการ มากที่สุด",
    to: "/onboarding",
    cta: "ไปกรอกโปรไฟล์",
  },
  {
    icon: Compass,
    title: "ค้นหาคู่เชื่อม",
    body: "หน้า “คู่เชื่อม” จะเรียงคนที่เข้ากับคุณมากที่สุด พร้อมบอกเหตุผลสั้น ๆ ว่าทำไมถึงแมตช์",
    tip: "ปัดการ์ดขวาเพื่อสนใจ ปัดซ้ายเพื่อข้าม หรือกรองตามภาค/ประเด็นได้",
    to: "/matches",
    cta: "ดูคู่เชื่อมของฉัน",
  },
  {
    icon: Handshake,
    title: "ส่งคำขอเชื่อม",
    body: "กด “ขอเชื่อม” แล้วอีกฝ่ายจะได้รับแจ้งเตือนทันที เมื่อตอบรับจะเปิดห้องคุยให้คุยต่อได้เลย",
    tip: "เปิดหน้าตลาดนัดไอเดียเพื่อหาเรื่องคุยเปิดบทสนทนา",
    to: "/marketplace",
    cta: "ดูตลาดนัดไอเดีย",
  },
  {
    icon: CheckCircle2,
    title: "ตั้งคำมั่นและวันนัด",
    body: "ทุกการเชื่อมควรจบด้วยก้าวต่อไปที่จับต้องได้ ระบุสิ่งที่จะทำ ใครรับผิดชอบ และนัดวันติดตามผล",
    tip: "ส่งออกวันนัดเข้าปฏิทินได้ พร้อมรับการเตือนก่อนถึงเวลา",
    to: "/commitments",
    cta: "ไปตั้งก้าวต่อไป",
  },
  {
    icon: Sparkles,
    title: "พร้อมแล้ว!",
    body: "ติดตามภาพรวมงานแบบสด ๆ ได้ที่หน้า “ภาพรวมสด” ทั้งจำนวนคู่เชื่อม คำมั่น และความคืบหน้าของทั้งงาน",
    tip: "เปิดทัวร์นี้อีกครั้งได้จากเมนูหน้าแรก",
    to: "/dashboard",
    cta: "ดูภาพรวมสด",
  },
];

export function GuidedTour() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { me, hydrated } = useStore();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  // มีโปรไฟล์แล้ว ไม่ต้องชวนสร้างโปรไฟล์อีก
  const steps = me ? STEPS.slice(1) : STEPS;

  useEffect(() => {
    if (hidden || !hydrated || !me || pathname !== AUTO_OPEN_PATH) return;
    let seen = true;
    try {
      seen = window.localStorage.getItem(KEY) === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [hidden, hydrated, me, pathname]);

  useEffect(() => {
    const handler = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener(TOUR_EVENT, handler);
    return () => window.removeEventListener(TOUR_EVENT, handler);
  }, []);

  const close = useCallback((opts?: { restore?: boolean }) => {
    const restore = opts?.restore ?? true;
    setOpen(false);
    setI(0);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    const el = prevFocus.current;
    prevFocus.current = null;
    if (restore && el && el.isConnected) el.focus?.();
  }, []);

  // ย้ายโฟกัสเข้ากล่อง ดักปุ่ม Tab ให้อยู่ในกล่อง และปิดด้วย Escape
  useEffect(() => {
    if (!open || hidden) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const raf = window.requestAnimationFrame(() => cardRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const items = Array.from(
        card.querySelectorAll<HTMLElement>("a[href],button:not([disabled])"),
      );
      if (items.length === 0) return;
      const first = items[0]!;
      const lastEl = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (!active || !card.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || active === card)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, hidden, close]);

  const idx = Math.min(i, steps.length - 1);
  const step = steps[idx];
  if (!open || hidden || !step) return null;
  const Icon = step.icon;
  const last = idx === steps.length - 1;

  const goBack = () => {
    const nextIdx = Math.max(0, idx - 1);
    setI(nextIdx);
    // ปุ่ม "ก่อนหน้า" จะหายไปที่ขั้นแรก ย้ายโฟกัสไปที่ "ถัดไป" แทน
    if (nextIdx === 0) window.requestAnimationFrame(() => nextRef.current?.focus());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/60 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="card-soft w-full max-w-md rounded-3xl bg-card p-5 shadow-xl outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-xs font-bold text-muted-foreground">
              ทัวร์แนะนำ · ขั้นที่ {idx + 1}/{steps.length}
            </p>
            <h2 id="tour-title" className="break-words text-[17px] font-extrabold leading-tight">
              {last ? step.title : `${idx + 1} · ${step.title}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => close()}
            aria-label="ปิดทัวร์แนะนำ"
            className="tap -mr-1.5 -mt-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p id="tour-body" className="mt-3 text-[13.5px] leading-relaxed text-foreground/90">
          {step.body}
        </p>
        <p className="mt-2 rounded-2xl bg-accent px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          เคล็ดลับ: {step.tip}
        </p>

        <Link
          to={step.to}
          onClick={() => close({ restore: false })}
          className="tap mt-3 flex h-11 items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground"
        >
          {step.cta}
        </Link>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
            {steps.map((s, n) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${
                  n === idx ? "w-5 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          {idx > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="tap inline-flex h-11 items-center gap-1 rounded-xl border border-border px-4 text-sm font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> ก่อนหน้า
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            onClick={() => (last ? close() : setI(idx + 1))}
            className="tap inline-flex h-11 items-center gap-1 rounded-xl bg-foreground px-4 text-sm font-bold text-background"
          >
            {last ? "เริ่มใช้งาน" : "ถัดไป"}
            {!last && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>

        {!last && (
          <button
            type="button"
            onClick={() => close()}
            className="tap mt-2 min-h-11 w-full rounded-xl text-center text-[13px] font-bold text-muted-foreground"
          >
            ข้ามทัวร์นี้
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ทัวร์แนะนำการใช้งาน — ไม่เปิดเอง (สเปก §2) เปิดได้ด้วยปุ่ม "ดูทัวร์แนะนำ" บนหน้า "ฉัน" (/update)
 * หรือ window.dispatchEvent(new Event(TOUR_EVENT)) จากที่ไหนก็ได้
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Handshake,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";

import { useStore } from "@/lib/store";

export const TOUR_EVENT = "connexts:start-tour";
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
    title: "บอกพลังของคุณ",
    body: "ชื่อ พื้นที่ ประเด็น และพลังที่มี/ต้องการ — ใช้ไม่ถึง 2 นาที",
    tip: "สิ่งที่มีให้และต้องการช่วยให้จับคู่แม่นขึ้น เริ่มได้โดยไม่ต้องล็อกอิน",
    to: "/onboarding",
    cta: "ไปกรอกโปรไฟล์",
  },
  {
    icon: Compass,
    title: "เลือกคนที่อยากคุย",
    body: "แท็บ จับคู่ แสดงทีละคน พร้อมเหตุผลว่าทำไมควรคุยกัน",
    tip: "กด ขอเชื่อมต่อ ถ้าอยากคุย กด ข้าม ถ้ายังไม่ใช่ หรือกด เก็บไว้ ดูทีหลัง",
    to: "/",
    cta: "ไปแท็บ จับคู่",
  },
  {
    icon: Handshake,
    title: "ขอเชื่อมต่อ",
    body: "ส่งคำขอให้อีกฝ่าย เมื่อตอบรับก็เริ่มคุยกันต่อได้เลย",
    tip: "หาไอเดียเปิดบทสนทนาได้ที่แท็บ สำรวจ แล้วเลือก ไอเดีย",
    to: "/marketplace",
    cta: "ดูไอเดีย",
  },
  {
    icon: CheckCircle2,
    title: "นัดก้าวต่อไป",
    body: "ตกลงสิ่งที่จะทำและวันติดตามผลกับคนที่เชื่อมกันแล้ว",
    tip: "คนที่เชื่อมกันอยู่ในแท็บ คู่ของฉัน เพิ่มนัดเข้าปฏิทินและรับการเตือนก่อนถึงเวลาได้",
    to: "/commitments",
    cta: "ไปแท็บ คู่ของฉัน",
  },
  {
    icon: Sparkles,
    title: "พร้อมไปต่อด้วยกัน",
    body: "ติดตามคู่ของคุณ นัดหมาย และความคืบหน้าของทั้งงานแบบสด ๆ",
    tip: "ดูภาพรวมสดได้จากแท็บ ฉัน และเปิดทัวร์นี้อีกครั้งได้ที่นั่นเช่นกัน",
    to: "/dashboard",
    cta: "ดูภาพรวมสด",
  },
];

export function GuidedTour() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { me } = useStore();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  // มีโปรไฟล์แล้ว ไม่ต้องชวนสร้างโปรไฟล์อีก
  const steps = me ? STEPS.slice(1) : STEPS;

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
      className="fixed inset-0 z-60 grid place-items-center meadow-tour-overlay bg-sky-soft/90 p-4 backdrop-blur-sm"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="relative max-h-[calc(100svh-32px)] w-full max-w-[540px] overflow-y-auto rounded-3xl border border-[#E6E3F2] bg-white p-6 text-ink shadow-[0_8px_24px_-12px_rgba(43,40,120,0.25)] outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky text-ink">
            <Icon className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-body font-semibold text-ink-soft">
              ขั้นที่ {idx + 1} จาก {steps.length}
            </p>
            <h2
              id="tour-title"
              className="font-heading text-title font-bold text-ink [overflow-wrap:anywhere]"
            >
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => close()}
            aria-label="ปิดทัวร์แนะนำ"
            className="tap -mr-2 -mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink hover:bg-sky-soft"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <p id="tour-body" className="mt-4 text-body text-ink">
          {step.body}
        </p>
        <p className="mt-3 rounded-2xl bg-sky-soft p-4 text-body text-ink-soft">{step.tip}</p>

        <Link
          to={step.to}
          onClick={() => close({ restore: false })}
          className="tap mt-5 flex min-h-14 items-center justify-center rounded-[18px] border-2 border-primary px-5 py-2 text-center text-body font-semibold text-primary"
        >
          {step.cta}
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {steps.map((s, n) => (
              <span
                key={s.title}
                className={`h-2 rounded-full transition-all motion-reduce:transition-none ${
                  n === idx ? "w-6 bg-primary" : "w-2 bg-[#C9C6E0]"
                }`}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 basis-64 flex-wrap items-center justify-end gap-2">
            {idx > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="tap inline-flex min-h-14 grow items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border border-[#C9C6E0] px-4 text-body font-semibold text-ink"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" /> ก่อนหน้า
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={() => (last ? close() : setI(idx + 1))}
              className="tap inline-flex min-h-14 grow items-center justify-center gap-2 whitespace-nowrap rounded-[18px] bg-primary px-5 text-body font-semibold text-white"
            >
              {last ? "เริ่มใช้งาน" : "ถัดไป"}
              {!last && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {!last && (
          <button
            type="button"
            onClick={() => close()}
            className="tap mt-2 block min-h-12 w-full text-center text-body font-semibold text-ink-soft underline underline-offset-4"
          >
            ข้ามทัวร์นี้
          </button>
        )}
      </div>
    </div>
  );
}

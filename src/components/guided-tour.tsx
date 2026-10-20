/**
 * ทัวร์แนะนำการใช้งานสำหรับผู้ใช้ครั้งแรก
 * - แสดงอัตโนมัติครั้งเดียว เมื่อมาถึงหน้า /matches ครั้งแรกหลังมีโปรไฟล์แล้ว (จำสถานะไว้ใน localStorage)
 *   ไม่เด้งขึ้นบนหน้าแรก /scan /join /start /onboarding เพื่อไม่ซ้อนกับ PDPA และ IntroGuide
 * - เปิดซ้ำได้ด้วย window.dispatchEvent(new Event(TOUR_EVENT))
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
import { MissionVisual } from "@/components/mission-ui";

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
    title: "บอกพลังของคุณ",
    body: "ชื่อ พื้นที่ ประเด็น และพลังที่มี/ต้องการ — ใช้ไม่ถึง 2 นาที",
    tip: "สิ่งที่มีให้และต้องการช่วยให้จับคู่แม่นขึ้น เริ่มได้โดยไม่ต้องล็อกอิน",
    to: "/onboarding",
    cta: "ไปกรอกโปรไฟล์",
  },
  {
    icon: Compass,
    title: "เลือกคนที่อยากคุย",
    body: "พบคนที่เข้ากับคุณ พร้อมเหตุผลว่าทำไมควรคุยกัน",
    tip: "ปัดขวาเพื่อสนใจ ซ้ายเพื่อข้าม กรองตามพื้นที่หรือประเด็นได้",
    to: "/matches",
    cta: "ค้นหาคู่เชื่อม",
  },
  {
    icon: Handshake,
    title: "ขอเชื่อมต่อ",
    body: "ส่งคำขอให้อีกฝ่าย เมื่อตอบรับก็เริ่มคุยกันต่อได้เลย",
    tip: "หาไอเดียเปิดบทสนทนาได้ที่ตลาดพลัง",
    to: "/marketplace",
    cta: "สำรวจตลาดพลัง",
  },
  {
    icon: CheckCircle2,
    title: "นัดก้าวต่อไป",
    body: "ตกลงสิ่งที่จะทำ ผู้รับผิดชอบ และวันติดตามผล",
    tip: "เพิ่มนัดเข้าปฏิทิน พร้อมรับการเตือนก่อนถึงเวลา",
    to: "/commitments",
    cta: "นัดก้าวต่อไป",
  },
  {
    icon: Sparkles,
    title: "พร้อมไปต่อด้วยกัน",
    body: "ติดตามคู่เชื่อม นัดหมาย และความคืบหน้าของทั้งงานแบบสด ๆ",
    tip: "เปิดคำแนะนำนี้อีกครั้งได้จากเมนู",
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
      className="guided-tour-dialog"
    >
      <div ref={cardRef} tabIndex={-1} className="guided-tour-card">
        <div className="guided-tour-heading">
          <span className="guided-tour-icon">
            <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="mission-kicker">
              QUICK GUIDE / {String(idx + 1).padStart(2, "0")} —{" "}
              {String(steps.length).padStart(2, "0")}
            </p>
            <h2 id="tour-title" className="guided-tour-title">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => close()}
            aria-label="ปิดทัวร์แนะนำ"
            className="tap guided-tour-close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <MissionVisual variant="signal" className="guided-tour-visual" />
        <p id="tour-body" className="guided-tour-body">
          {step.body}
        </p>
        <p className="guided-tour-tip">{step.tip}</p>

        <Link
          to={step.to}
          onClick={() => close({ restore: false })}
          className="tap guided-tour-destination"
        >
          {step.cta}
        </Link>

        <div className="guided-tour-controls">
          <div className="guided-tour-progress" aria-hidden="true">
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
            <button type="button" onClick={goBack} className="tap guided-tour-previous">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> ก่อนหน้า
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            onClick={() => (last ? close() : setI(idx + 1))}
            className="tap guided-tour-next"
          >
            {last ? "เริ่มใช้งาน" : "ถัดไป"}
            {!last && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>

        {!last && (
          <button type="button" onClick={() => close()} className="tap guided-tour-skip">
            ข้ามทัวร์นี้
          </button>
        )}
      </div>
    </div>
  );
}

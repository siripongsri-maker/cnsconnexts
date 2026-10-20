import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, HeartHandshake, Sparkles, UserCircle2 } from "lucide-react";

export const INTRO_KEY = "connexts-intro-seen-v1";

export function hasSeenIntro() {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

export const INTRO_STEPS = [
  {
    icon: Sparkles,
    title: "เจอคนที่ควรคุย",
    body: "จับคู่จากพลังที่มี สิ่งที่ต้องการ และประเด็นที่สนใจ",
    detail: "พร้อมเหตุผลว่าทำไมควรคุยกัน",
  },
  {
    icon: HeartHandshake,
    title: "เลือกคนที่ใช่",
    body: "ปัดขวา = ถูกใจ · ปัดซ้าย = ข้าม",
    detail: "กด “ขอเชื่อมต่อ” เพื่อเริ่มคุยและนัดก้าวต่อไป",
  },
  {
    icon: UserCircle2,
    title: "เริ่มใน 3 ขั้นตอน",
    body: "สร้างโปรไฟล์ → เชื่อมต่อ → นัดร่วมทำ",
    detail: "ไม่ถึง 2 นาที ไม่ต้องล็อกอิน ติดตามนัดได้หลังงาน",
  },
] as const;

/** การ์ดแนะนำก่อนเริ่มใช้งาน 3 ขั้น (อ่านไม่เกิน 20 วินาที) */
export function IntroGuide({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const item = INTRO_STEPS[step]!;
  const Icon = item.icon;
  const last = step === INTRO_STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* ignore */
    }
    onDone();
  };

  return (
    <section className="intro-guide mission-panel" aria-label="แนะนำการเชื่อมพลัง">
      <div className="intro-guide-heading">
        <span className="intro-guide-icon">
          <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="mission-kicker">QUICK START / {String(step + 1).padStart(2, "0")} — 03</p>
          <h2 className="intro-guide-title">{item.title}</h2>
        </div>
      </div>

      <div className="intro-guide-copy" aria-live="polite">
        <p>{item.body}</p>
        <p>{item.detail}</p>
      </div>

      <div className="intro-guide-actions">
        <div className="intro-guide-progress" aria-hidden>
          {INTRO_STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={finish}
          className="tap inline-flex h-11 items-center rounded-xl px-3 text-[13px] font-bold text-muted-foreground"
        >
          ข้าม
        </button>
        <button
          type="button"
          onClick={() => (last ? finish() : setStep((v) => v + 1))}
          className="tap inline-flex h-11 items-center gap-1.5 rounded-2xl gradient-power px-5 text-[14px] font-extrabold text-primary-foreground"
        >
          {last ? "เริ่มเลย" : "ถัดไป"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {last && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" /> ดูวิธีใช้เพิ่มเติมที่
          <Link to="/guide" className="text-primary underline underline-offset-4">
            คู่มือใช้งาน
          </Link>
        </p>
      )}
    </section>
  );
}

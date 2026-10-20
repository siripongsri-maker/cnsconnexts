import { useState } from "react";
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
    title: "แอปนี้มีไว้ทำอะไร",
    body: "ช่วยให้คุณเจอ “คนที่ควรคุยด้วย” ในงานนี้ ภายในไม่กี่นาที แทนการเดินหาเอง",
    detail: "เราจับคู่จากสิ่งที่คุณมี กับสิ่งที่อีกฝ่ายกำลังต้องการ และประเด็นที่สนใจตรงกัน",
  },
  {
    icon: HeartHandshake,
    title: "คุณจะได้อะไรกลับไป",
    body: "รายชื่อคนที่เชื่อมกับคุณได้จริง พร้อมเหตุผลว่าทำไมถึงควรคุยกัน",
    detail: "และนัดหมาย “ก้าวต่อไป” ที่ติดตามได้หลังจบงาน ไม่ใช่แค่แลกนามบัตร",
  },
  {
    icon: UserCircle2,
    title: "ใช้งานแค่ 3 ขั้นตอน",
    body: "1) สร้างโปรไฟล์พลัง  2) เลือกคนที่ใช่  3) นัดก้าวต่อไป",
    detail: "ไม่ต้องล็อกอินก็เริ่มได้ทันที ใช้เวลาไม่ถึง 2 นาที",
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
    <div className="card-soft mb-5 rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/12">
          <Icon className="h-6 w-6 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            แนะนำก่อนเริ่ม {step + 1}/{INTRO_STEPS.length}
          </p>
          <h2 className="mt-0.5 text-[18px] font-extrabold leading-snug">{item.title}</h2>
        </div>
      </div>

      <p className="mt-3 text-[15px] font-semibold leading-relaxed">{item.body}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{item.detail}</p>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex flex-1 gap-1.5" aria-hidden>
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
          className="tap px-2 text-[13px] font-bold text-muted-foreground"
        >
          ข้าม
        </button>
        <button
          type="button"
          onClick={() => (last ? finish() : setStep((v) => v + 1))}
          className="tap inline-flex h-11 items-center gap-1.5 rounded-2xl gradient-power px-5 text-[14px] font-extrabold text-primary-foreground"
        >
          {last ? "เริ่มเลย" : "ถัดไป"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {last && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <CalendarCheck className="h-3.5 w-3.5" /> อ่านคู่มือฉบับเต็มได้ที่หน้า “คู่มือใช้งาน”
        </p>
      )}
    </div>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, Handshake, Sparkles, Zap } from "lucide-react";

import { useStore } from "@/lib/store";
import { useLiveEvents } from "@/lib/live";

/**
 * แผงความคืบหน้าแบบสด — อัปเดตทันทีเมื่อมีการเชื่อมต่อหรือคำมั่นสัญญาใหม่
 * พร้อมบอก "ก้าวต่อไป" ให้ผู้ใช้รู้ว่าต้องทำอะไรต่อ
 */
export function LiveProgress() {
  const { connections, commitments } = useStore();
  const events = useLiveEvents(1);
  const latest = events[0] ?? null;
  const [pulse, setPulse] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const mine = connections.filter((c) => c.user_a === "me" || c.user_b === "me");
  const myCommitments = commitments.filter((m) => mine.some((c) => c.id === m.connection_id));
  const scheduled = myCommitments.filter((m) => m.follow_up_date);
  const done = myCommitments.filter((m) => m.status === "Completed");
  // คู่เชื่อมล่าสุด — ใช้เป็นปลายทางของ "ชวนกันตั้งก้าวแรก"
  const latestConn =
    [...mine].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0] ??
    mine[mine.length - 1];

  useEffect(() => {
    if (!latest) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [latest]);

  const steps = [
    { icon: Handshake, label: "เชื่อมต่อ", value: mine.length, done: mine.length > 0 },
    {
      icon: Sparkles,
      label: "นัดลงมือทำ",
      value: myCommitments.length,
      done: myCommitments.length > 0,
    },
    {
      icon: CalendarClock,
      label: "นัดวันเวลา",
      value: scheduled.length,
      done: scheduled.length > 0,
    },
    { icon: CheckCircle2, label: "ทำสำเร็จ", value: done.length, done: done.length > 0 },
  ];

  const next =
    mine.length === 0
      ? {
          title: "เริ่มจากคนที่พลังเสริมกัน",
          detail: "ค้นหาคนที่ใช่ แล้วกดขอเชื่อมต่อ",
          to: "/matches" as const,
          cta: "หาคนที่น่าเจอ",
        }
      : myCommitments.length === 0
        ? {
            title: "ตกลงก้าวแรกด้วยกัน",
            detail: "คุยกับคู่เชื่อม แล้วเลือกสิ่งแรกที่จะทำร่วมกัน",
            to: "/commitments" as const,
            cta: "ชวนกันตั้งก้าวแรก",
          }
        : scheduled.length === 0
          ? {
              title: "กำหนดวันเริ่มลงมือ",
              detail: "กำหนดวันคุยต่อ แล้วส่งนัดเข้าห้องแชทให้คู่ของคุณตอบรับ",
              to: "/calendar" as const,
              cta: "เปิดปฏิทินนัดหมาย",
            }
          : done.length < myCommitments.length
            ? {
                title: "อัปเดตสิ่งที่ทำร่วมกัน",
                detail: "ทำตามนัดแล้ว เปลี่ยนสถานะเป็น “ทำสำเร็จ”",
                to: "/commitments" as const,
                cta: "อัปเดตสถานะ",
              }
            : {
                title: "เยี่ยมมาก! ครบทุกขั้นแล้ว",
                detail: "ต่อยอดได้อีก — เชื่อมกับคนใหม่ หรือเสนอไอเดียในตลาดพลัง",
                to: "/marketplace" as const,
                cta: "ไปตลาดพลัง",
              };

  const ctaClass =
    "tap mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-extrabold text-primary-foreground";

  return (
    <section
      className={`core-live-progress card-soft rounded-3xl bg-card p-5 transition-shadow ${pulse ? "ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime/25 text-ink">
          <Zap className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-[15px] font-extrabold">จากรู้จัก สู่ลงมือทำ</h2>
      </div>

      <ol className="mt-4 grid grid-cols-4 gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.label} className="text-center">
              <span
                className={`mx-auto grid h-10 w-10 place-items-center rounded-2xl ${
                  s.done ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="mt-1 text-lg font-extrabold leading-none">{s.value}</p>
              <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                {i + 1}. {s.label}
              </p>
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" aria-atomic="true">
        {latest && (
          <p className="mt-4 truncate rounded-xl bg-muted/60 px-3 py-2 text-[12px] text-muted-foreground">
            ล่าสุด: <span className="font-bold text-foreground">{latest.title}</span> ·{" "}
            {latest.detail}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-primary/40 p-4">
        <p className="text-[14px] font-extrabold">{next.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{next.detail}</p>
        {mine.length > 0 && myCommitments.length === 0 && latestConn ? (
          <Link to="/connection/$id" params={{ id: latestConn.id }} className={ctaClass}>
            {next.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : next.to === "/commitments" && pathname === "/commitments" ? (
          <a href="#my-commitments" className={ctaClass}>
            {next.cta} <span aria-hidden="true">↓</span>
          </a>
        ) : (
          <Link to={next.to} className={ctaClass}>
            {next.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}

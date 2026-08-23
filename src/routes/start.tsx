import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Sparkles, UserCircle2, Zap } from "lucide-react";

import { createSession, getSession, type ParticipantSession } from "@/lib/session";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "เริ่มสร้าง Power Profile — คนส. Connext" },
      {
        name: "description",
        content:
          "เข้าห้องสำเร็จแล้ว เริ่มสร้าง Power Profile ได้ทันทีโดยไม่ต้องล็อกอิน แล้วผูกบัญชีอีเมลทีหลังเมื่อพร้อม",
      },
      { property: "og:title", content: "เริ่มสร้าง Power Profile" },
      {
        property: "og:description",
        content: "ไม่ต้องล็อกอิน ใช้เวลา 2 นาที แล้วเจอคนที่ควรเชื่อมต่อทันที",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StartPage,
});

const STEPS = [
  { t: "บอกว่าคุณคือใคร", d: "ชื่อ รูป ภาค/จังหวัด" },
  { t: "เลือกประเด็นที่สนใจ", d: "เพื่อหาเพื่อนร่วมประเด็น" },
  { t: "สิ่งที่ให้ได้ / สิ่งที่ต้องการ", d: "หัวใจของการจับคู่พลัง" },
];

function StartPage() {
  const navigate = useNavigate();
  const { enterGuest, mode } = useAuth();
  const { me, hydrated } = useStore();
  const [session, setSession] = useState<ParticipantSession | null>(null);

  useEffect(() => {
    setSession(getSession() ?? createSession("direct", null));
  }, []);

  const begin = () => {
    if (mode !== "user") enterGuest();
    if (!getSession()) createSession("direct", null);
    void navigate({ to: "/onboarding" });
  };

  return (
    <div className="relative min-h-screen bg-background px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "var(--gradient-soft)" }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex max-w-xl flex-col animate-rise">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-lime/40 bg-card/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary backdrop-blur">
          <CheckCircle2 className="h-3.5 w-3.5" />
          เข้าห้องสำเร็จ
        </span>

        <h1 className="mt-4 text-[clamp(1.9rem,8vw,2.6rem)] font-extrabold leading-tight tracking-tighter">
          <span className="text-gradient">เริ่มสร้าง Power Profile</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ไม่ต้องล็อกอิน ใช้เวลาประมาณ 2 นาที แล้วระบบจะจับคู่คนที่คุณควรเจอในงานนี้ให้ทันที
        </p>

        {session && (
          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            ห้อง {session.code ?? "NHA26"} · เซสชัน {session.id}
          </p>
        )}

        <ol className="card-soft mt-6 space-y-4 rounded-3xl bg-card p-5">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full gradient-power text-[12px] font-extrabold text-primary-foreground">
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-bold">{s.t}</span>
                <span className="block text-[12px] text-muted-foreground">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={begin}
          className="tap glow mt-5 flex h-16 items-center justify-between rounded-3xl gradient-power px-6 text-primary-foreground"
        >
          <span className="text-left">
            <span className="block text-base font-extrabold">
              {hydrated && me ? "แก้ไข Power Profile ของฉัน" : "เริ่มสร้าง Power Profile"}
            </span>
            <span className="block text-[12px] opacity-90">ไม่ต้องล็อกอิน · เริ่มเลย</span>
          </span>
          <Zap className="h-5 w-5 shrink-0" />
        </button>

        <div className="card-soft mt-5 rounded-3xl bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Link2 className="h-4 w-4 text-primary" />
            ผูกบัญชีทีหลังก็ได้
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            ตอนนี้ข้อมูลจะเก็บไว้ในเครื่องนี้ก่อน เมื่อพร้อมค่อยเชื่อมโปรไฟล์เดิมเข้ากับอีเมลหรือ Google
            เพื่อไม่ให้ข้อมูลหาย — โปรไฟล์ที่กรอกไว้จะถูกย้ายไปให้อัตโนมัติ
          </p>
          <Link
            to="/auth"
            className="tap mt-3 inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-[13px] font-bold"
          >
            <UserCircle2 className="h-4 w-4" />
            ผูกบัญชีตอนนี้
          </Link>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          เชื่อมคน · เชื่อมไอเดีย · เชื่อมพื้นที่
        </p>
      </div>
    </div>
  );
}

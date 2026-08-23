import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  QrCode,
  Menu,
  X,
  Sparkles,
  Map,
  Store,
  CheckCircle2,
  Radio,
  FileText,
  BookOpen,
  Printer,
  UserCircle, CalendarDays,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/lib/auth";
import { useMotionSettings } from "@/lib/motion";
import { ThailandNetwork } from "@/components/thailand-network";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "คนส. Connexts — เชื่อมคน เชื่อมไอเดีย เชื่อมพลัง" },
      {
        name: "description",
        content:
          "ทุกคนมีพลังของตัวเอง มาค้นหาว่าวันนี้คุณควรเชื่อมกับใคร ในงานสมัชชาสุขภาพแห่งชาติ",
      },
      { property: "og:title", content: "คนส. Connexts" },
      {
        property: "og:description",
        content: "เชื่อมคน เชื่อมไอเดีย เชื่อมพื้นที่ สู่การลงมือทำ",
      },
    ],
  }),
  component: Welcome,
});

const STATS = [
  { n: "128", l: "คน" },
  { n: "42", l: "ไอเดีย" },
  { n: "86", l: "การเชื่อม" },
  { n: "4", l: "ภูมิภาค" },
];

const NAV_LINKS = [
  { to: "/matches", label: "คู่เชื่อม", icon: Sparkles },
  { to: "/map", label: "แผนที่พลัง", icon: Map },
  { to: "/marketplace", label: "ตลาดนัด", icon: Store },
  { to: "/commitments", label: "ก้าวต่อไป", icon: CheckCircle2 },
  { to: "/calendar", label: "ปฏิทินนัด", icon: CalendarDays },
  { to: "/dashboard", label: "สด", icon: Radio },
  { to: "/submit", label: "ส่งผลงาน", icon: FileText },
  { to: "/ebook", label: "รวมผลงาน", icon: BookOpen },
  { to: "/print", label: "ไฟล์พิมพ์", icon: Printer },
  { to: "/update", label: "อัปเดตข้อมูล", icon: UserCircle },
  { to: "/scan", label: "สแกนเข้าร่วม", icon: QrCode },

] as const;

function Welcome() {
  const { reducedMotion, lowSpec } = useMotionSettings();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "var(--gradient-soft)" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-[10%] bottom-0 z-0 text-primary opacity-55">
        <ThailandNetwork count={18} reducedMotion={reducedMotion} lowSpec={lowSpec} />
      </div>

      <TopNav />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col justify-between px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(6rem,env(safe-area-inset-top)+4.5rem)]">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-lime animate-pulse-node" />
            สมัชชาสุขภาพแห่งชาติ
          </span>
        </div>

        <div className="animate-rise py-10" style={{ animationDelay: "80ms" }}>
          <h1 className="min-w-0">
            <Wordmark size="hero" />
          </h1>
          <p className="mt-4 text-lg font-semibold text-primary">
            เชื่อมคน เชื่อมไอเดีย เชื่อมพื้นที่ สู่การลงมือทำ
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            ทุกคนมีพลังไม่เหมือนกัน มาค้นหากันเถอะว่าวันนี้คุณควรเชื่อมต่อกับใคร
          </p>
        </div>

        <div className="animate-rise grid grid-cols-4 gap-2" style={{ animationDelay: "160ms" }}>
          {STATS.map((s) => (
            <div key={s.l} className="card-soft px-2 py-3 text-center">
              <p className="text-xl font-extrabold text-gradient">{s.n}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {s.l}
              </p>
            </div>
          ))}
        </div>

        <div className="animate-rise mt-8 space-y-3" style={{ animationDelay: "240ms" }}>
          <Link
            to="/onboarding"
            className="tap glow flex h-16 items-center justify-between rounded-3xl gradient-power px-6 text-primary-foreground"
          >
            <span className="text-left">
              <span className="block text-base font-extrabold">ค้นหาคนที่ควรเชื่อมต่อ</span>
              <span className="block text-[12px] opacity-90">Find My Connections</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
          <Link
            to="/scan"
            className="tap flex h-14 items-center justify-center gap-2 rounded-3xl border border-border bg-card/80 text-sm font-bold backdrop-blur"
          >
            <QrCode className="h-4 w-4" />
            สแกน QR เข้าร่วมทันที (ไม่ต้องล็อกอิน)
          </Link>

          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            ใช้เวลาไม่ถึง 2 นาที · Takes 1–2 minutes
          </p>
        </div>
      </div>
    </div>
  );
}

function TopNav() {
  const [open, setOpen] = useState(false);
  const { mode, displayName, signOut } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]">
        <Link to="/" className="font-display text-[15px] leading-none tracking-tight">
          <Wordmark size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tap inline-grid h-9 w-9 place-items-center rounded-full bg-accent text-foreground"
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={open}
        >
          {open ? (
            <X className="h-5 w-5" strokeWidth={2.2} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={2.2} />
          )}
        </button>
      </div>

      {open && (
        <nav className="max-h-[75vh] overflow-y-auto border-t border-border/60 bg-background/95 px-4 pb-4 pt-3">
          <ul className="grid grid-cols-3 gap-2">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() => setOpen(false)}
                  className="tap flex flex-col items-center gap-1.5 rounded-2xl bg-accent p-3 text-center text-[11px] font-semibold text-foreground"
                >
                  <Icon className="h-5 w-5 text-primary" strokeWidth={2} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-border/60 pt-3">
            {mode === "anon" ? (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="tap flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground"
              >
                เข้าสู่ระบบ / สร้างบัญชี
              </Link>
            ) : (
              <div className="flex items-center justify-between rounded-2xl bg-accent px-4 py-3">
                <span className="min-w-0 truncate text-sm font-bold">{displayName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="tap shrink-0 text-sm font-bold text-primary"
                >
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

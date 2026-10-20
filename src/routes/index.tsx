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
  UserCircle,
  CalendarDays,
  Compass,
  BookOpenCheck,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useMotionSettings } from "@/lib/motion";
import { getPublicStats } from "@/lib/stats.functions";
import { ThailandNetwork } from "@/components/thailand-network";
import { Wordmark } from "@/components/wordmark";
import { TOUR_EVENT } from "@/components/guided-tour";
import { PdpaConsent } from "@/components/pdpa-consent";
import { SponsorFooter } from "@/components/sponsor-footer";
import { BottomNav } from "@/components/bottom-nav";

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
  loader: async () => {
    try {
      const stats = await getPublicStats();
      return { stats };
    } catch {
      return { stats: { participants: 0, ideas: 0, connections: 0 } };
    }
  },
  component: Welcome,
});



const NAV_LINKS = [
  { to: "/guide", label: "คู่มือใช้งาน", icon: BookOpenCheck },
  { to: "/matches", label: "คู่เชื่อม", icon: Sparkles },
  { to: "/map", label: "แผนที่พลัง", icon: Map },
  { to: "/marketplace", label: "ตลาดนัด", icon: Store },
  { to: "/commitments", label: "ก้าวต่อไป", icon: CheckCircle2 },
  { to: "/calendar", label: "ปฏิทินนัด", icon: CalendarDays },
  { to: "/dashboard", label: "ภาพรวมสด", icon: Radio },
  { to: "/submit", label: "ส่งผลงาน", icon: FileText },
  { to: "/ebook", label: "รวมผลงาน", icon: BookOpen },
  { to: "/update", label: "แก้โปรไฟล์", icon: UserCircle },
  { to: "/scan", label: "สแกนเข้าร่วม", icon: QrCode },
] as const;

function Welcome() {
  const { reducedMotion, lowSpec } = useMotionSettings();
  const { stats } = Route.useLoaderData();
  const { users, ideas, connections } = useStore();
  const live = {
    people: Math.max(stats.participants, users.length),
    ideas: Math.max(stats.ideas, ideas.length),
    connections: Math.max(stats.connections, connections.length),
    regions: new Set(users.map((u) => u.region).filter((r) => r && r !== "Nationwide")).size,
  };
  const tiles = [
    { n: live.people, th: "คน", en: "People" },
    { n: live.ideas, th: "ไอเดีย", en: "Ideas" },
    { n: live.connections, th: "การเชื่อม", en: "Connections" },
    { n: live.regions, th: "ภาค", en: "Regions" },
  ];
  return (
    <div className="relative min-h-screen overflow-hidden">
      <PdpaConsent />
      <div className="pointer-events-none absolute inset-x-0 top-[10%] bottom-0 z-0 text-primary opacity-55">
        <ThailandNetwork count={18} reducedMotion={reducedMotion} lowSpec={lowSpec} />
      </div>

      <TopNav />
      <BottomNav />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col justify-between px-6 pb-[max(6.5rem,env(safe-area-inset-bottom)+5rem)] pt-[max(6rem,env(safe-area-inset-top)+4.5rem)]">

        <div className="animate-rise py-10" style={{ animationDelay: "80ms" }}>
          <p lang="en" className="mb-2 font-tech text-sm font-bold uppercase tracking-wide text-primary">
            Connecting Power
          </p>
          <h1 className="min-w-0">
            <Wordmark size="hero" />
          </h1>
          <p className="mt-4 text-lg font-semibold text-primary">
            เชื่อมคน เชื่อมไอเดีย เชื่อมพื้นที่ สู่การลงมือทำ
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            ทุกคนมีพลังไม่เหมือนกัน มาค้นหากันเถอะว่าวันนี้คุณควรเชื่อมต่อกับใคร
          </p>
          <p lang="en" className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
            Everyone brings a different kind of power. Let's discover who you should connect with
            today.
          </p>
        </div>
        <div className="animate-rise" style={{ animationDelay: "160ms" }}>
          {live.people > 0 ? (
            <>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse"
                  aria-hidden="true"
                />
                สด · <span lang="en">Live</span>
              </p>
              <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-4">
                {tiles.map((t) => (
                  <div key={t.en} className="card-soft px-2 py-3 text-center">
                    <p className="font-tech text-2xl font-bold text-primary">{t.n}</p>
                    <p className="text-xs font-bold text-muted-foreground">{t.th}</p>
                    <p lang="en" className="text-xs text-muted-foreground">
                      {t.en}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card-soft px-4 py-3">
              <p className="text-sm font-bold">เพิ่งเปิดงาน มาเป็นคนแรกที่เชื่อมพลังกันนะ</p>
              <p lang="en" className="text-xs text-muted-foreground">
                We're just getting started. Be the first to connect!
              </p>
            </div>
          )}
        </div>

        <div className="animate-rise mt-8 space-y-3" style={{ animationDelay: "240ms" }}>
          <Link
            to="/onboarding"
            className="tap flex h-16 items-center justify-between rounded-3xl cta-holo px-6 text-primary-foreground"
          >
            <span className="text-left">
              <span className="block text-base font-extrabold">ค้นหาคนที่ควรเชื่อมต่อ</span>
              <span lang="en" className="block text-[12px] opacity-90">
                Find My Connections
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
          <Link
            to="/map"
            className="tap flex h-14 items-center gap-3 rounded-3xl border border-border bg-card/80 px-5 backdrop-blur"
          >
            <Map className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-left leading-tight">
              <span className="block text-sm font-bold">สำรวจแผนที่พลัง</span>
              <span lang="en" className="block text-xs text-muted-foreground">
                Explore the Power Map
              </span>
            </span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/scan"
              className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-primary"
            >
              <QrCode className="h-4 w-4" aria-hidden="true" />
              มี QR จากบอร์ด? สแกนเลย
            </Link>
            <Link
              to="/guide"
              className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-primary"
            >
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              ดูวิธีใช้ใน 1 นาที
            </Link>
          </div>

          <p className="pt-1 text-center text-xs text-muted-foreground">
            ใช้เวลาไม่ถึง 2 นาที · Takes 1–2 minutes
          </p>
        </div>

        <SponsorFooter className="mt-8" />
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
        <Link to="/" className="min-w-0 shrink" aria-label="คนส. Connexts หน้าแรก">
          <Wordmark size="sm" withMark />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tap inline-grid h-11 w-11 place-items-center rounded-full bg-accent text-foreground"
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={open}
        >
          {open ? (
            <X className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
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
                  className="tap flex flex-col items-center gap-1.5 rounded-2xl bg-accent p-3 text-center text-xs font-semibold text-foreground"
                >
                  <Icon className="h-5 w-5 text-primary" strokeWidth={2} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new Event(TOUR_EVENT));
            }}
            className="tap mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border text-sm font-bold text-foreground"
          >
            <Compass className="h-4 w-4 text-primary" aria-hidden="true" /> ทัวร์แนะนำการใช้งาน
          </button>

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
                  className="tap inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-primary"
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

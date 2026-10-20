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
import { getPublicStats } from "@/lib/stats.functions";
import heroOrbit from "@/assets/hero-orbit-3d.jpg";
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
  { to: "/dashboard", label: "ภาพรวมสด", icon: Radio },
  { to: "/submit", label: "ส่งผลงาน", icon: FileText },
  { to: "/ebook", label: "รวมผลงาน", icon: BookOpen },
  { to: "/update", label: "โปรไฟล์ของฉัน", icon: UserCircle },
  { to: "/scan", label: "สแกนเข้าร่วม", icon: QrCode },
] as const;

function Welcome() {
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
      <TopNav />
      <BottomNav />

      {/* HERO — ภาพเต็มจอแบบภารกิจอวกาศ */}
      <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden px-6 pb-[max(7rem,env(safe-area-inset-bottom)+6rem)] pt-28">
        <img
          src={heroOrbit}
          alt=""
          width={1024}
          height={1280}
          fetchPriority="high"
          className="absolute inset-0 -z-10 h-full w-full animate-hero-drift object-cover object-top opacity-80"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(to top, var(--background) 18%, transparent 65%)" }}
          aria-hidden
        />
        <div className="mx-auto w-full max-w-xl animate-rise">
          <p lang="en" className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-electric-ink">
            Find your people. Act together.
          </p>
          <h1 className="mt-3 text-[clamp(2.6rem,13vw,4.5rem)] font-extrabold uppercase leading-[0.92] tracking-tight">
            <span lang="en" className="font-tech block">Connecting</span>
            <span lang="en" className="font-tech block text-gradient">Power</span>
          </h1>
          <p className="mt-4 text-lg font-bold">เชื่อมคน เชื่อมไอเดีย เชื่อมพื้นที่ สู่การลงมือทำ</p>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            ทุกคนมีพลังไม่เหมือนกัน ปัดหาคนที่ใช่ในงานนี้ ใช้เวลาไม่ถึง 2 นาที
          </p>
          <div className="mt-6 flex flex-col gap-3 min-[420px]:flex-row">
            <Link
              to="/onboarding"
              className="tap inline-flex h-14 shrink-0 items-center justify-between min-[420px]:flex-1 rounded-full cta-holo px-6 text-base font-extrabold text-primary-foreground"
            >
              เริ่มหาคนที่ใช่ <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              to="/scan"
              className="tap inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-card/40 px-6 text-sm font-bold backdrop-blur"
            >
              <QrCode className="h-4 w-4" aria-hidden /> สแกน QR
            </Link>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-xl px-6 pb-[max(7rem,env(safe-area-inset-bottom)+6rem)]">
        {/* ตัวเลขสดแบบสเปกชีต */}
        <section aria-label="สถิติสดในงาน" className="border-y border-border">
          <p className="flex items-center gap-2 pt-4 font-tech text-xs font-bold uppercase tracking-[0.2em] text-electric-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-electric motion-safe:animate-pulse" aria-hidden />
            Live now · สดในงาน
          </p>
          <div className="grid grid-cols-2 min-[420px]:grid-cols-4">
            {tiles.map((t) => (
              <Link key={t.en} to="/dashboard" className="tap block py-4 pr-3">
                <p className="font-tech text-4xl font-bold tracking-tight">{t.n}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {t.th} · <span lang="en">{t.en}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* โจทย์ / ทางออก */}
        <section className="py-14">
          <p lang="en" className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-electric-ink">The Challenge</p>
          <h2 className="mt-3 text-[26px] leading-snug">
            คนเก่งมาอยู่ในงานเดียวกันเป็นพัน <span className="text-muted-foreground">แต่ไม่รู้จะคุยกับใคร แลกนามบัตรแล้วก็จบแค่นั้น</span>
          </h2>
          <p lang="en" className="mt-12 font-tech text-xs font-bold uppercase tracking-[0.2em] text-electric-ink">The Solution</p>
          <h2 className="mt-3 text-[26px] leading-snug">
            บอกว่าคุณมีพลังอะไร ต้องการอะไร <span className="text-gradient">แล้วระบบจับคู่คนที่เติมกันได้พอดี</span>
          </h2>
        </section>

        {/* เส้นทางภารกิจ 4 ขั้น */}
        <section className="pb-14">
          <p lang="en" className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-electric-ink">Mission lifecycle</p>
          <ol className="mt-4">
            {STEPS.map((st, i) => (
              <li key={st.en}>
                <Link to={st.to} className="tap group flex items-baseline gap-5 border-t border-border py-5">
                  <span className="font-tech text-sm font-bold text-muted-foreground">0{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-extrabold">{st.th}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{st.d}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="card-soft holo-border rounded-[2rem] p-7 text-center">
          <h2 className="text-[28px] uppercase leading-tight">
            <span lang="en" className="font-tech">Ready to launch?</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">สร้างโปรไฟล์พลัง แล้วเริ่มปัดหาคนที่ใช่ได้ทันที</p>
          <Link
            to="/onboarding"
            className="tap mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full cta-holo text-base font-extrabold text-primary-foreground"
          >
            เริ่มเลย <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/guide" className="tap mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary">
            <BookOpenCheck className="h-4 w-4" aria-hidden /> ดูวิธีใช้ใน 1 นาที
          </Link>
        </section>

        <SponsorFooter className="mt-10" />
      </div>
    </div>
  );
}

const STEPS = [
  { th: "สร้างโปรไฟล์พลัง", en: "Profile", d: "บอกสิ่งที่ให้ได้และสิ่งที่ต้องการ", to: "/onboarding" },
  { th: "ปัดหาคนที่ใช่", en: "Match", d: "การ์ดเต็มจอ พร้อมเหตุผลที่ควรเจอกัน", to: "/matches" },
  { th: "เชื่อมและนัดคุย", en: "Connect", d: "แชท เสนอวันเวลา ในแอปเดียว", to: "/commitments" },
  { th: "ลงมือทำด้วยกัน", en: "Act", d: "ไอเดียขึ้นตลาดพลัง และติดตามผลสด", to: "/marketplace" },
] as const;

function TopNav() {
  const [open, setOpen] = useState(false);
  const { mode, displayName, signOut } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-30 bg-background/40 backdrop-blur-md">
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

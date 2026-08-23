import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, QrCode } from "lucide-react";
import { NetworkBackground } from "@/components/network-background";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "คนส. Connect — เชื่อมคน เชื่อมไอเดีย เชื่อมพลัง" },
      {
        name: "description",
        content:
          "ทุกคนมีพลังของตัวเอง มาค้นหาว่าวันนี้คุณควรเชื่อมกับใคร ในงานสมัชชาสุขภาพแห่งชาติ",
      },
      { property: "og:title", content: "คนส. Connect" },
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

function Welcome() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "var(--gradient-soft)" }}
        aria-hidden
      />
      <div className="absolute inset-0 z-0 text-primary opacity-45">
        <NetworkBackground count={26} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col justify-between px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-lime animate-pulse-node" />
            สมัชชาสุขภาพแห่งชาติ
          </span>
        </div>

        <div className="animate-rise py-10" style={{ animationDelay: "80ms" }}>
          <h1 className="text-[clamp(2.75rem,14vw,4.5rem)] font-extrabold leading-[0.92] tracking-tighter">
            <span className="block text-gradient">CONNECTING</span>
            <span className="block text-ink">POWER</span>
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
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/map"
              className="tap flex h-14 items-center justify-center rounded-3xl border border-border bg-card/80 text-sm font-bold backdrop-blur"
            >
              แผนที่พลัง
            </Link>
            <Link
              to="/qr"
              className="tap flex h-14 items-center justify-center gap-2 rounded-3xl border border-border bg-card/80 text-sm font-bold backdrop-blur"
            >
              <QrCode className="h-4 w-4" />
              สแกนเพื่อเข้าร่วม
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { to: "/submit" as const, label: "ส่งผลงาน" },
              { to: "/ebook" as const, label: "รวมผลงาน" },
              { to: "/print" as const, label: "ไฟล์พิมพ์" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="tap flex h-12 items-center justify-center rounded-2xl border border-border bg-card/80 text-[13px] font-bold backdrop-blur"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            ใช้เวลาไม่ถึง 2 นาที · Takes 1–2 minutes
          </p>
        </div>
      </div>
    </div>
  );
}

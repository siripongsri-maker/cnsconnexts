import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { NetworkBackground } from "@/components/network-background";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connecting Power — Connect People, Ideas & Power" },
      {
        name: "description",
        content:
          "Everyone brings a different kind of power. Find who you should connect with today at Thailand's National Health Assembly.",
      },
      { property: "og:title", content: "Connecting Power" },
      {
        property: "og:description",
        content: "เชื่อมคน เชื่อมไอเดีย เชื่อมพื้นที่ สู่การลงมือทำ",
      },
    ],
  }),
  component: Welcome,
});

const STATS = [
  { n: "128", l: "People", th: "คน" },
  { n: "42", l: "Ideas", th: "ไอเดีย" },
  { n: "86", l: "Connections", th: "การเชื่อม" },
  { n: "4", l: "Regions", th: "ภูมิภาค" },
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
            National Health Assembly
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
            Everyone brings a different kind of power. Let's discover who you should connect with
            today.
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
              <span className="block text-base font-extrabold">Find My Connections</span>
              <span className="block text-[12px] opacity-90">ค้นหาคนที่ควรเชื่อมต่อ</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
          <Link
            to="/map"
            className="tap flex h-14 items-center justify-center rounded-3xl border border-border bg-card/80 text-sm font-bold backdrop-blur"
          >
            Explore the Power Map
          </Link>
          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            Takes 1–2 minutes · ใช้เวลาไม่ถึง 2 นาที
          </p>
        </div>
      </div>
    </div>
  );
}

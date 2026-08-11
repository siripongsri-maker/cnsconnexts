import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NetworkBackground } from "@/components/network-background";
import { useStore } from "@/lib/store";
import { POWER_EMOJI, REGIONS } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Live Power Dashboard — Connecting Power" },
      {
        name: "description",
        content: "Live numbers from the floor: people, connections, ideas and commitments.",
      },
      { property: "og:title", content: "Live Power Dashboard" },
      { property: "og:description", content: "วันนี้พลังของคุณจะไปเชื่อมกับใคร?" },
    ],
  }),
  component: Dashboard,
});

const MESSAGES = [
  { en: "Who will you connect with next?", th: "วันนี้พลังของคุณจะไปเชื่อมกับใคร?" },
  { en: "Every power finds a partner.", th: "ทุกพลังมีคู่ของมันเสมอ" },
  { en: "One conversation can start a project.", th: "หนึ่งบทสนทนา เริ่มต้นหนึ่งโครงการ" },
];

function useCountUp(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1200, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

function Dashboard() {
  const { users, ideas, connections, commitments } = useStore();
  const [msg, setMsg] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsg((m) => (m + 1) % MESSAGES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const stats = {
    people: 136 + users.length,
    connections: 83 + connections.length,
    ideas: 33 + ideas.length,
    commitments: 23 + commitments.length,
  };

  const topIssues = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => u.interests.forEach((i) => map.set(i, (map.get(i) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [users]);

  const rank = (key: "powers_have" | "powers_need") => {
    const map = new Map<string, number>();
    users.forEach((u) => u[key].forEach((p) => map.set(p, (map.get(p) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  };

  const byRegion = REGIONS.map((r) => ({
    region: r,
    count: connections.filter((c) => {
      const a = users.find((u) => u.id === c.user_a);
      const b = users.find((u) => u.id === c.user_b);
      return a?.region === r || b?.region === r;
    }).length,
  })).sort((a, b) => b.count - a.count);

  const maxRegion = Math.max(1, ...byRegion.map((r) => r.count));
  const message = MESSAGES[msg]!;

  return (
    <AppShell title="Live Dashboard" subtitle="Connecting Power · on the floor right now">
      <div className="relative overflow-hidden px-5 py-4">
        <div className="relative overflow-hidden rounded-3xl gradient-power p-5 text-primary-foreground">
          <div className="absolute inset-0 text-white/70">
            <NetworkBackground count={20} seed={12} />
          </div>
          <div className="relative grid grid-cols-2 gap-4">
            <Big n={stats.people} label="People" />
            <Big n={stats.connections} label="Connections" />
            <Big n={stats.ideas} label="Ideas" />
            <Big n={stats.commitments} label="Commitments" />
          </div>
          <div key={msg} className="animate-rise relative mt-5 border-t border-white/25 pt-4">
            <p className="text-base font-extrabold">{message.en}</p>
            <p className="text-sm opacity-90">{message.th}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-6">
        <Panel title="Top Issues">
          {topIssues.map(([issue, count]) => (
            <Bar key={issue} label={issue} value={count} max={topIssues[0]![1]} tone="primary" />
          ))}
        </Panel>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Panel title="Most Needed Power">
            {rank("powers_need").map(([p, c]) => (
              <Bar key={p} label={`${POWER_EMOJI[p] ?? ""} ${p}`} value={c} max={rank("powers_need")[0]![1]} tone="coral" />
            ))}
          </Panel>
          <Panel title="Most Shared Power">
            {rank("powers_have").map(([p, c]) => (
              <Bar key={p} label={`${POWER_EMOJI[p] ?? ""} ${p}`} value={c} max={rank("powers_have")[0]![1]} tone="lime" />
            ))}
          </Panel>
        </div>

        <Panel title="Connections by Region">
          {byRegion.map((r) => (
            <Bar key={r.region} label={r.region} value={r.count} max={maxRegion} tone="electric" />
          ))}
        </Panel>
      </div>
    </AppShell>
  );
}

function Big({ n, label }: { n: number; label: string }) {
  const v = useCountUp(n);
  return (
    <div>
      <p className="text-[clamp(2rem,11vw,3rem)] font-extrabold leading-none tracking-tighter">
        {v}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-90">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-soft p-4">
      <h2 className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "primary" | "coral" | "lime" | "electric";
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary",
    coral: "bg-coral",
    lime: "bg-lime",
    electric: "bg-electric",
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold">{label}</p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${bg[tone]} transition-all duration-700`}
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

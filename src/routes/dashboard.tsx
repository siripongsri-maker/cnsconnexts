import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Handshake, Sparkles, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { NetworkBackground } from "@/components/network-background";
import { useStore, useUserMap } from "@/lib/store";
import { POWER_EMOJI, REGIONS, type ConnectionStatus } from "@/lib/types";
import { issueTh, powerTh, REGION_LABEL } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "แดชบอร์ดสด — คนส. Connect" },
      {
        name: "description",
        content:
          "แดชบอร์ดสดสำหรับผู้จัดและผู้เข้าร่วม: ดูการแมตช์ การเชื่อมต่อ และความคืบหน้าคำมั่นสัญญาแบบเรียลไทม์",
      },
      { property: "og:title", content: "แดชบอร์ดสด — คนส. Connect" },
      {
        property: "og:description",
        content: "ตัวเลขสด ฟีดกิจกรรม และความคืบหน้าการลงมือทำของทั้งงาน",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const STATUS_TH: Record<ConnectionStatus, string> = {
  Connected: "เชื่อมแล้ว",
  Planning: "กำลังวางแผน",
  "In Progress": "กำลังทำ",
  Completed: "สำเร็จ",
};

const STATUS_ORDER: ConnectionStatus[] = ["Connected", "Planning", "In Progress", "Completed"];
const STATUS_TONE: Record<ConnectionStatus, "primary" | "electric" | "coral" | "lime"> = {
  Connected: "primary",
  Planning: "electric",
  "In Progress": "coral",
  Completed: "lime",
};

function useCountUp(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1000, 1);
      setN(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

function ago(iso: string, now: number) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

type Feed = {
  id: string;
  icon: "connect" | "commit";
  title: string;
  detail: string;
  created_at: string;
};

function Dashboard() {
  const { me, users, ideas, connections, commitments } = useStore();
  const userMap = useUserMap();
  const [view, setView] = useState<"organizer" | "me">("organizer");
  const [now, setNow] = useState(() => Date.now());

  // live pulse: keeps relative times and "สด" indicator moving
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const stats = {
    people: 136 + users.length,
    connections: 83 + connections.length,
    ideas: 33 + ideas.length,
    commitments: 23 + commitments.length,
  };

  const funnel = useMemo(
    () =>
      STATUS_ORDER.map((s) => ({
        status: s,
        conn: connections.filter((c) => c.status === s).length,
        commit: commitments.filter((c) => c.status === s).length,
      })),
    [connections, commitments],
  );
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.conn + f.commit));
  const done = commitments.filter((c) => c.status === "Completed").length;
  const completion = commitments.length ? Math.round((done / commitments.length) * 100) : 0;

  const feed = useMemo<Feed[]>(() => {
    const items: Feed[] = [];
    connections.forEach((c) => {
      const a = userMap[c.user_a]?.name ?? "ผู้เข้าร่วม";
      const b = userMap[c.user_b]?.name ?? "ผู้เข้าร่วม";
      items.push({
        id: `c-${c.id}`,
        icon: "connect",
        title: `${a} × ${b}`,
        detail: `แมตช์ ${c.match_score}% · ${STATUS_TH[c.status]}`,
        created_at: c.created_at,
      });
    });
    commitments.forEach((m) => {
      const conn = connections.find((c) => c.id === m.connection_id);
      const pair = conn
        ? `${userMap[conn.user_a]?.name ?? "?"} × ${userMap[conn.user_b]?.name ?? "?"}`
        : "คู่เชื่อม";
      items.push({
        id: `m-${m.id}`,
        icon: "commit",
        title: `${pair} นัดลงมือทำ`,
        detail: `${m.description} · ${STATUS_TH[m.status]}`,
        created_at: m.created_at,
      });
    });
    return items
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 12);
  }, [connections, commitments, userMap]);

  const mine = useMemo(() => {
    if (!me) return null;
    const conns = connections.filter((c) => c.user_a === me.id || c.user_b === me.id);
    const ids = new Set(conns.map((c) => c.id));
    const comms = commitments.filter((m) => ids.has(m.connection_id));
    return {
      conns,
      comms,
      done: comms.filter((m) => m.status === "Completed").length,
      active: comms.filter((m) => m.status === "In Progress" || m.status === "Planning").length,
    };
  }, [me, connections, commitments]);

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
      const a = userMap[c.user_a];
      const b = userMap[c.user_b];
      return a?.region === r || b?.region === r;
    }).length,
  })).sort((a, b) => b.count - a.count);
  const maxRegion = Math.max(1, ...byRegion.map((r) => r.count));

  return (
    <AppShell title="แดชบอร์ดสด" subtitle="คนส. Connect · การแมตช์ การเชื่อม และการลงมือทำแบบเรียลไทม์">
      <div className="px-5 pt-4">
        <div className="flex rounded-2xl border border-border bg-card p-1">
          {(
            [
              { k: "organizer", l: "มุมผู้จัด" },
              { k: "me", l: "มุมของฉัน" },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setView(t.k)}
              className={`tap h-10 flex-1 rounded-xl text-[13px] font-extrabold transition ${
                view === t.k ? "gradient-power text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="relative overflow-hidden rounded-3xl gradient-power p-5 text-primary-foreground">
          <div className="absolute inset-0 text-white/70">
            <NetworkBackground count={20} seed={12} />
          </div>
          <div className="relative flex items-center gap-2 pb-4 text-[11px] font-bold uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-lime animate-pulse-node" />
            สด · อัปเดตอัตโนมัติ
          </div>
          <div className="relative grid grid-cols-2 gap-4">
            {view === "organizer" ? (
              <>
                <Big n={stats.people} label="คน" />
                <Big n={stats.connections} label="คอนเนกชัน" />
                <Big n={stats.ideas} label="ไอเดีย" />
                <Big n={stats.commitments} label="คำมั่นสัญญา" />
              </>
            ) : (
              <>
                <Big n={mine?.conns.length ?? 0} label="คู่เชื่อมของฉัน" />
                <Big n={mine?.comms.length ?? 0} label="นัดลงมือทำ" />
                <Big n={mine?.active ?? 0} label="กำลังทำ" />
                <Big n={mine?.done ?? 0} label="สำเร็จแล้ว" />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-6">
        {view === "me" && !me && (
          <section className="card-soft p-5 text-center">
            <p className="text-sm font-bold">ยังไม่มีโปรไฟล์ในเครื่องนี้</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              สร้างโปรไฟล์เพื่อดูความคืบหน้าการเชื่อมต่อของคุณ
            </p>
            <Link
              to="/onboarding"
              className="tap mt-4 inline-flex h-12 items-center justify-center rounded-2xl gradient-power px-6 text-sm font-extrabold text-primary-foreground"
            >
              สร้างโปรไฟล์
            </Link>
          </section>
        )}

        <Panel title="ความคืบหน้าคำมั่นสัญญา">
          <div className="mb-3 flex items-end justify-between">
            <p className="text-3xl font-extrabold text-gradient">{completion}%</p>
            <p className="text-[12px] font-bold text-muted-foreground">
              สำเร็จ {done}/{commitments.length} รายการ
            </p>
          </div>
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-lime transition-all duration-700"
              style={{ width: `${completion}%` }}
            />
          </div>
          {funnel.map((f) => (
            <Bar
              key={f.status}
              label={`${STATUS_TH[f.status]} · เชื่อม ${f.conn} · นัดทำ ${f.commit}`}
              value={f.conn + f.commit}
              max={maxFunnel}
              tone={STATUS_TONE[f.status]}
            />
          ))}
        </Panel>

        <Panel title={view === "me" ? "กิจกรรมล่าสุดของคุณและทั้งงาน" : "ฟีดกิจกรรมสด"}>
          {feed.length === 0 && (
            <p className="text-[13px] text-muted-foreground">ยังไม่มีกิจกรรม — เริ่มเชื่อมต่อกันเลย</p>
          )}
          <ul className="space-y-2.5">
            {feed.map((f) => (
              <li key={f.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                    f.icon === "connect" ? "bg-primary/12 text-primary" : "bg-lime/20 text-ink"
                  }`}
                >
                  {f.icon === "connect" ? (
                    <Handshake className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">{f.title}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{f.detail}</p>
                </div>
                <span className="ml-auto shrink-0 text-[11px] font-bold text-muted-foreground">
                  {ago(f.created_at, now)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {view === "me" && mine && (
          <Panel title="คู่เชื่อมของฉัน">
            {mine.conns.length === 0 && (
              <p className="text-[13px] text-muted-foreground">ยังไม่มีคู่เชื่อม — ไปหาคนที่ใช่กันก่อน</p>
            )}
            {mine.conns.map((c) => {
              const other = userMap[c.user_a === me?.id ? c.user_b : c.user_a];
              return (
                <Link
                  key={c.id}
                  to="/connection/$id"
                  params={{ id: c.id }}
                  className="tap flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold">{other?.name ?? "ผู้เข้าร่วม"}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      แมตช์ {c.match_score}% · {STATUS_TH[c.status]}
                    </p>
                  </div>
                  <Sparkles className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
            <Link
              to="/matches"
              className="tap mt-1 flex h-12 items-center justify-center gap-2 rounded-2xl border border-border text-sm font-extrabold"
            >
              <Activity className="h-4 w-4" /> หาคู่เชื่อมเพิ่ม
            </Link>
          </Panel>
        )}

        {view === "organizer" && (
          <>
            <Panel title="ประเด็นยอดฮิต">
              {topIssues.map(([issue, count]) => (
                <Bar
                  key={issue}
                  label={issueTh(issue)}
                  value={count}
                  max={topIssues[0]![1]}
                  tone="primary"
                />
              ))}
            </Panel>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Panel title="พลังที่ต้องการมากที่สุด">
                {rank("powers_need").map(([p, c]) => (
                  <Bar
                    key={p}
                    label={`${POWER_EMOJI[p] ?? ""} ${powerTh(p)}`}
                    value={c}
                    max={rank("powers_need")[0]![1]}
                    tone="coral"
                  />
                ))}
              </Panel>
              <Panel title="พลังที่แชร์กันมากที่สุด">
                {rank("powers_have").map(([p, c]) => (
                  <Bar
                    key={p}
                    label={`${POWER_EMOJI[p] ?? ""} ${powerTh(p)}`}
                    value={c}
                    max={rank("powers_have")[0]![1]}
                    tone="lime"
                  />
                ))}
              </Panel>
            </div>

            <Panel title="คอนเนกชันแยกตามภูมิภาค">
              {byRegion.map((r) => (
                <Bar
                  key={r.region}
                  label={REGION_LABEL[r.region]}
                  value={r.count}
                  max={maxRegion}
                  tone="electric"
                />
              ))}
            </Panel>
          </>
        )}
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

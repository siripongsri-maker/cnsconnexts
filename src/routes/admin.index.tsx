import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  Handshake,
  Lightbulb,
  MapPin,
  Radio,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { RECORD_CHIP, type AdminRecord } from "@/components/admin/record-colors";
import { MeadowScene } from "@/components/meadow-scene";
import { stepChangeLabel } from "@/lib/funnel-format";
import { useStore } from "@/lib/store";
import { useLiveEvents } from "@/lib/live";
import { useUsageLogs } from "@/lib/usage-log";

type Bucket = "day" | "week";

/** สร้างชุดข้อมูลแนวโน้มผู้ใช้จริงรายวัน/รายสัปดาห์ (สะสมด้วย) */
function buildTrend(dates: string[], bucket: Bucket) {
  const points = bucket === "day" ? 14 : 8;
  const now = new Date();
  const startOf = (d: Date) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (bucket === "week") x.setDate(x.getDate() - x.getDay());
    return x;
  };
  const keys: Date[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const d = startOf(now);
    d.setDate(d.getDate() - i * (bucket === "week" ? 7 : 1));
    keys.push(d);
  }
  const counts = new Map<number, number>();
  for (const iso of dates) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const k = startOf(d).getTime();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let cumulative = dates.filter((iso) => {
    const d = new Date(iso);
    return !Number.isNaN(d.getTime()) && startOf(d).getTime() < keys[0]!.getTime();
  }).length;

  return keys.map((k) => {
    const n = counts.get(k.getTime()) ?? 0;
    cumulative += n;
    return {
      label: k.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      ใหม่: n,
      สะสม: cumulative,
    };
  });
}

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "ภาพรวมผู้ดูแล — คนส. Connexts" },
      { name: "description", content: "ภาพรวมผู้ดูแลสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "ภาพรวมผู้ดูแล — คนส. Connexts" },
      {
        property: "og:description",
        content: "ภาพรวมผู้ดูแลสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const { users, ideas, submissions, connections, commitments, provinceNotes } = useStore();
  const events = useLiveEvents(8);
  const [bucket, setBucket] = useState<Bucket>("day");

  const demoIds = new Set(Array.from({ length: 20 }, (_, i) => `u${i + 1}`));
  const realUsers = users.filter((u) => !demoIds.has(u.id));

  const stats: {
    label: string;
    value: number;
    icon: typeof Users;
    to:
      | "/admin/people"
      | "/admin/connections"
      | "/admin/commitments"
      | "/admin/ideas"
      | "/admin/submissions"
      | "/admin/map";
    record: AdminRecord;
  }[] = [
    { label: "สมาชิก", value: users.length, icon: Users, to: "/admin/people", record: "member" },
    {
      label: "ผู้ใช้จริง",
      value: realUsers.length,
      icon: UserCheck,
      to: "/admin/people",
      record: "member",
    },
    {
      label: "คู่เชื่อม",
      value: connections.length,
      icon: Handshake,
      to: "/admin/connections",
      record: "connection",
    },
    {
      label: "คำมั่นสัญญา",
      value: commitments.length,
      icon: CalendarDays,
      to: "/admin/commitments",
      record: "commitment",
    },
    { label: "ไอเดีย", value: ideas.length, icon: Lightbulb, to: "/admin/ideas", record: "idea" },
    {
      label: "ผลงานส่งเข้า",
      value: submissions.length,
      icon: BookOpen,
      to: "/admin/submissions",
      record: "submission",
    },
    {
      label: "บันทึกจังหวัด",
      value: provinceNotes.length,
      icon: MapPin,
      to: "/admin/map",
      record: "province",
    },
  ];

  const trend = useMemo(
    () =>
      buildTrend(
        realUsers.map((u) => u.created_at),
        bucket,
      ),
    [realUsers, bucket],
  );

  const logs = useUsageLogs();

  /** Funnel: Welcome → Power Profile → Interests → Have/Need → Discover → Connect → Commitment */
  const funnel = useMemo(() => {
    const realIds = new Set(realUsers.map((u) => u.id));
    const visitors = new Set(logs.map((l) => l.visitor));
    const discoverVisitors = new Set(
      logs
        .filter((l) => /\/(matches|discover)/.test(l.path ?? "") || /แมตช์|match/i.test(l.label))
        .map((l) => l.visitor),
    );

    const realConnections = connections.filter(
      (c) => realIds.has(c.user_a) || realIds.has(c.user_b),
    );
    const connectedUsers = new Set<string>();
    for (const c of realConnections) {
      if (realIds.has(c.user_a)) connectedUsers.add(c.user_a);
      if (realIds.has(c.user_b)) connectedUsers.add(c.user_b);
    }
    const connIds = new Set(realConnections.map((c) => c.id));
    const committedConnections = new Set(
      commitments.filter((m) => connIds.has(m.connection_id)).map((m) => m.connection_id),
    );

    const profile = realUsers.filter((u) => u.name.trim().length > 0).length;
    const interests = realUsers.filter((u) => u.interests.length > 0).length;
    const haveNeed = realUsers.filter(
      (u) => u.powers_have.length > 0 || u.powers_need.length > 0,
    ).length;
    const welcome = Math.max(visitors.size, profile);
    const discover = Math.max(discoverVisitors.size, connectedUsers.size);

    return [
      { step: "Welcome", th: "เข้าหน้าแรก", value: welcome },
      { step: "Power Profile", th: "สร้างโปรไฟล์", value: profile },
      { step: "Select Interests", th: "เลือกประเด็นสนใจ", value: interests },
      { step: "Have / Need", th: "ระบุพลังที่มี/ต้องการ", value: haveNeed },
      { step: "Discover Matches", th: "ดูคู่แมตช์", value: discover },
      { step: "Connect", th: "กดเชื่อมต่อ", value: connectedUsers.size },
      { step: "Make a Commitment", th: "ตั้งคำมั่นสัญญา", value: committedConnections.size },
    ];
  }, [realUsers, connections, commitments, logs]);

  const funnelTop = funnel[0]?.value ?? 0;

  return (
    <div className="admin-workspace admin-workspace-overview space-y-5">
      <ul className="admin-stat-group" aria-label="ตัวเลขรวม">
        {stats.map(({ label, value, icon: Icon, to, record }) => (
          <li key={label}>
            <Link to={to} className="admin-stat-cell">
              <span className="admin-stat-figure">
                <span className={`admin-stat-icon ${RECORD_CHIP[record]}`}>
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="admin-stat-value">{value}</span>
              </span>
              <span className="admin-stat-label">{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="admin-overview-growth card-soft rounded-2xl bg-card p-4">
        <div className="admin-growth-head">
          <div className="min-w-0">
            <h2 className="text-title font-extrabold">การเติบโตของสมาชิก</h2>
            <p className="text-body text-muted-foreground">
              {bucket === "day" ? "14 วันล่าสุด" : "8 สัปดาห์ล่าสุด"}
            </p>
          </div>
          <div className="admin-segmented flex rounded-xl bg-muted p-0.5">
            {(["day", "week"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBucket(b)}
                className={`tap rounded-lg px-3 py-1.5 text-body font-bold ${
                  bucket === b ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {b === "day" ? "รายวัน" : "รายสัปดาห์"}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="h-1 w-6 rounded-full bg-[var(--tag-purple-bg)]" />
            สะสม (ยอดรวมถึงวันนั้น)
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0 w-6 border-t-[3px] border-dashed border-[var(--tag-purple-bg)]"
            />
            ใหม่ (เข้าร่วมในช่วงนั้น)
          </li>
        </ul>

        <div className="admin-growth-chart mt-3 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="realUsersFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--tag-purple-bg)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--tag-purple-bg)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 16 }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
                tickMargin={16}
                padding={{ left: 12, right: 12 }}
                height={44}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 16 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 16,
                }}
              />
              <Area
                type="monotone"
                dataKey="สะสม"
                stroke="var(--tag-purple-bg)"
                strokeWidth={3}
                fill="url(#realUsersFill)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="ใหม่"
                stroke="var(--tag-purple-bg)"
                strokeWidth={3}
                strokeDasharray="6 5"
                fill="none"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="admin-overview-funnel card-soft rounded-2xl bg-card p-4">
        <h2 className="text-title font-extrabold">จากผู้เข้าชมสู่การลงมือ</h2>

        <div className="mt-3 space-y-2">
          {funnel.map((s, i) => {
            const prev = i === 0 ? s.value : (funnel[i - 1]?.value ?? 0);
            const width =
              funnelTop > 0 ? Math.max((s.value / funnelTop) * 100, s.value > 0 ? 6 : 2) : 2;
            const fromTop = funnelTop > 0 ? Math.round((s.value / funnelTop) * 100) : 0;
            return (
              <div key={s.step}>
                <div className="admin-funnel-row flex items-baseline justify-between gap-2 text-body">
                  <span className="font-bold">
                    {i + 1}. {s.th}
                  </span>
                  <span className="admin-funnel-count text-muted-foreground">
                    <span className="font-extrabold text-foreground">{s.value}</span> ·{" "}
                    <span className="whitespace-nowrap">{fromTop}% ของทั้งหมด</span>
                    {i > 0 ? (
                      <>
                        {" "}
                        ·{" "}
                        <span className="whitespace-nowrap">{stepChangeLabel(s.value, prev)}</span>
                      </>
                    ) : null}
                  </span>
                </div>
                <div className="mt-1 h-4 w-full overflow-hidden rounded-lg bg-muted">
                  <div
                    className="h-full rounded-lg bg-[var(--tag-purple-bg)]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-body text-muted-foreground">
          จากเข้าหน้าแรกจนถึงตั้งคำมั่นสัญญา:{" "}
          <span className="font-extrabold text-primary">
            {funnelTop > 0 ? Math.round(((funnel.at(-1)?.value ?? 0) / funnelTop) * 100) : 0}%
          </span>
        </p>
      </section>

      <div className="admin-overview-side">
        <section className="admin-overview-live card-soft rounded-2xl bg-card p-4">
          <h2 className="text-title font-extrabold">กิจกรรมสดล่าสุด</h2>
          {events.length === 0 ? (
            <p className="mt-1 flex items-center gap-2 text-body text-muted-foreground">
              <Radio className="size-5 shrink-0" aria-hidden="true" />
              ยังไม่มีความเคลื่อนไหวสดตอนนี้
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {events.map((e) => (
                <li key={e.id} className="break-words text-body">
                  <span className="font-bold">{e.title}</span>
                  <span className="text-muted-foreground"> · {e.detail}</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/admin/live"
            className="mt-3 inline-block text-body font-extrabold text-primary"
          >
            เปิดจอฉายกิจกรรมสด →
          </Link>
          {events.length === 0 && (
            <MeadowScene
              variant="empty"
              className="admin-card-scene admin-overview-live-scene h-[120px]"
            />
          )}
        </section>

        <section className="admin-overview-docs card-soft rounded-2xl bg-card p-4">
          <h2 className="text-title font-extrabold">เอกสารเส้นทางทุกหน้า</h2>
          <Link to="/journey" className="mt-2 inline-block text-body font-extrabold text-primary">
            เปิดเอกสารเส้นทางทุกหน้า →
          </Link>
        </section>
      </div>
    </div>
  );
}

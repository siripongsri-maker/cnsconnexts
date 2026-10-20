import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Handshake, Lightbulb, MapPin, UserCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
  component: AdminOverview,
});

function AdminOverview() {
  const { users, ideas, submissions, connections, commitments, provinceNotes } = useStore();
  const events = useLiveEvents(8);
  const [bucket, setBucket] = useState<Bucket>("day");

  const demoIds = new Set(Array.from({ length: 20 }, (_, i) => `u${i + 1}`));
  const realUsers = users.filter((u) => !demoIds.has(u.id));

  const stats = [
    { label: "สมาชิก", value: users.length, icon: Users, to: "/admin/people" as const },
    {
      label: "ผู้ใช้จริง (ไม่ใช่เดโม่)",
      value: realUsers.length,
      icon: UserCheck,
      to: "/admin/people" as const,
    },
    { label: "ไอเดีย", value: ideas.length, icon: Lightbulb, to: "/admin/ideas" as const },
    { label: "ผลงานส่งเข้า", value: submissions.length, icon: BookOpen, to: "/admin/submissions" as const },
    { label: "คู่เชื่อม", value: connections.length, icon: Handshake, to: "/admin/connections" as const },
    { label: "คำมั่นสัญญา", value: commitments.length, icon: CalendarDays, to: "/admin/commitments" as const },
    { label: "บันทึกรายจังหวัด", value: provinceNotes.length, icon: MapPin, to: "/admin/map" as const },
  ];

  const trend = useMemo(
    () => buildTrend(realUsers.map((u) => u.created_at), bucket),
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
    <div className="space-y-5">
      <section>
        <h1 className="text-[18px] font-extrabold">ภาพรวมงาน</h1>
        <p className="text-[12px] text-muted-foreground">ตัวเลขทั้งหมดอัปเดตทันทีตามข้อมูลจริงในระบบ</p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className="card-soft rounded-2xl bg-card p-4">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/12 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-2xl font-extrabold text-gradient">{value}</p>
            <p className="text-xs font-bold text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <section className="card-soft rounded-2xl bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-extrabold">แนวโน้มผู้ใช้ onboard จริง</h2>
            <p className="text-xs text-muted-foreground">
              {bucket === "day" ? "14 วันล่าสุด" : "8 สัปดาห์ล่าสุด"} · ใหม่และยอดสะสม
            </p>
          </div>
          <div className="flex rounded-xl bg-muted p-0.5">
            {(["day", "week"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBucket(b)}
                className={`tap rounded-lg px-3 py-1.5 text-xs font-bold ${
                  bucket === b ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {b === "day" ? "รายวัน" : "รายสัปดาห์"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="realUsersFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="สะสม"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#realUsersFill)"
              />
              <Area
                type="monotone"
                dataKey="ใหม่"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-[14px] font-extrabold">Funnel การใช้งาน</h2>
        <p className="text-xs text-muted-foreground">
          อัตราคอนเวอร์ชันจากผู้เข้าชม → โปรไฟล์ → ประเด็น → พลัง → คู่แมตช์ → เชื่อมต่อ → คำมั่นสัญญา
        </p>

        <div className="mt-3 space-y-2">
          {funnel.map((s, i) => {
            const prev = i === 0 ? s.value : (funnel[i - 1]?.value ?? 0);
            const width = funnelTop > 0 ? Math.max((s.value / funnelTop) * 100, s.value > 0 ? 6 : 2) : 2;
            const fromTop = funnelTop > 0 ? Math.round((s.value / funnelTop) * 100) : 0;
            const fromPrev = prev > 0 ? Math.round((s.value / prev) * 100) : 0;
            return (
              <div key={s.step}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-bold">
                    {i + 1}. {s.th} <span className="text-muted-foreground">· {s.step}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    <span className="font-extrabold text-foreground">{s.value}</span> · {fromTop}% ของทั้งหมด
                    {i > 0 ? ` · ${fromPrev}% จากขั้นก่อน` : ""}
                  </span>
                </div>
                <div className="mt-1 h-4 w-full overflow-hidden rounded-lg bg-muted">
                  <div
                    className="h-full rounded-lg bg-primary/80"
                    style={{ width: `${width}%`, opacity: 1 - i * 0.09 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          คอนเวอร์ชันรวม Welcome → คำมั่นสัญญา:{" "}
          <span className="font-extrabold text-primary">
            {funnelTop > 0 ? Math.round(((funnel.at(-1)?.value ?? 0) / funnelTop) * 100) : 0}%
          </span>
        </p>
      </section>

      <section className="card-soft rounded-2xl bg-card p-4">

        <h2 className="text-[14px] font-extrabold">กิจกรรมสดล่าสุด</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted-foreground">ยังไม่มีสัญญาณสด</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="truncate text-[12px]">
                <span className="font-bold">{e.title}</span>
                <span className="text-muted-foreground"> · {e.detail}</span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/admin/live" className="mt-3 inline-block text-[12px] font-extrabold text-primary">
          เปิดจอฉายกิจกรรมสด →
        </Link>
      </section>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-[14px] font-extrabold">เอกสาร Journey ทุกฟังก์ชัน</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          คู่มือฉบับเดียวจบ พร้อมภาพหน้าจอทุกหน้า ข้อมูลเข้า-ออก และวิธีเชื่อมหน้าบ้านกับหลังบ้าน
        </p>
        <Link to="/journey" className="mt-2 inline-block text-[12px] font-extrabold text-primary">
          เปิดเอกสาร Journey →
        </Link>
      </section>
    </div>
  );
}

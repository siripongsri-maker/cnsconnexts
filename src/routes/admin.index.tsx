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
            <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <section className="card-soft rounded-2xl bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-extrabold">แนวโน้มผู้ใช้ onboard จริง</h2>
            <p className="text-[11px] text-muted-foreground">
              {bucket === "day" ? "14 วันล่าสุด" : "8 สัปดาห์ล่าสุด"} · ใหม่และยอดสะสม
            </p>
          </div>
          <div className="flex rounded-xl bg-muted p-0.5">
            {(["day", "week"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBucket(b)}
                className={`tap rounded-lg px-3 py-1.5 text-[11px] font-bold ${
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Handshake, Lightbulb, MapPin, Users } from "lucide-react";

import { useStore } from "@/lib/store";
import { useLiveEvents } from "@/lib/live";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { users, ideas, submissions, connections, commitments, provinceNotes } = useStore();
  const events = useLiveEvents(8);

  const stats = [
    { label: "สมาชิก", value: users.length, icon: Users, to: "/admin/people" as const },
    { label: "ไอเดีย", value: ideas.length, icon: Lightbulb, to: "/admin/ideas" as const },
    { label: "ผลงานส่งเข้า", value: submissions.length, icon: BookOpen, to: "/admin/submissions" as const },
    { label: "คู่เชื่อม", value: connections.length, icon: Handshake, to: "/admin/connections" as const },
    { label: "คำมั่นสัญญา", value: commitments.length, icon: CalendarDays, to: "/admin/commitments" as const },
    { label: "บันทึกรายจังหวัด", value: provinceNotes.length, icon: MapPin, to: "/admin/map" as const },
  ];

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

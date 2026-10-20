import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { MonitorPlay, Radio } from "lucide-react";

import { useStore } from "@/lib/store";
import { buildFeed, RotatingPrompt } from "@/components/live-ticker";

export const Route = createFileRoute("/admin/live")({
  head: () => ({ meta: [
    { title: "จอสดผู้ดูแล — คนส. Connexts" },
    { name: "description", content: "จอสดผู้ดูแลสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
    { property: "og:title", content: "จอสดผู้ดูแล — คนส. Connexts" },
    { property: "og:description", content: "จอสดผู้ดูแลสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminLive,
});

function AdminLive() {
  const { users, connections, commitments } = useStore();
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  // ฟีดจากข้อมูลที่ซิงก์ทุกเครื่อง — แบบไม่ระบุชื่อ เพราะขึ้นจอสาธารณะ
  const feed = useMemo(
    () =>
      buildFeed({
        connections,
        commitments,
        allConnections: connections,
        userMap,
        anonymous: true,
        limit: 20,
      }),
    [connections, commitments, userMap],
  );

  const done = commitments.filter((c) => c.status === "Completed").length;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-coral/15 text-coral">
          <Radio className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-[18px] font-extrabold">จอฉายกิจกรรมสด</h1>
          <p className="text-[12px] text-muted-foreground">
            ใช้ “จอฉายเต็มจอ” ด้านล่างเพื่อขึ้นโปรเจกเตอร์ — ไม่มีเมนูแอดมินติดไปบนจอ
          </p>
        </div>
      </header>

      <Link
        to="/dashboard"
        search={{ present: "1" }}
        className="tap flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-[15px] font-extrabold text-primary-foreground"
      >
        <MonitorPlay className="h-5 w-5" aria-hidden="true" />
        เปิดจอฉายเต็มจอ <span lang="en">· Open projector view</span>
      </Link>

      <div className="card-soft rounded-2xl p-4">
        <RotatingPrompt size="lg" tone="card" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["คน", users.length],
          ["คู่เชื่อม", connections.length],
          ["นัดลงมือทำ", commitments.length],
          ["ทำสำเร็จ", done],
        ].map(([label, value]) => (
          <div key={String(label)} className="card-soft rounded-2xl bg-card p-4 text-center">
            <p className="font-tech text-4xl font-extrabold text-primary">{value}</p>
            <p className="text-[13px] font-bold text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-[14px] font-extrabold">
          ใครกำลังเชื่อมกันอยู่ตอนนี้ <span lang="en" className="text-muted-foreground">· Happening now</span>
        </h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          ไม่แสดงชื่อ — บอกแค่ภาคและเรื่องที่สนใจร่วมกัน
        </p>
        {feed.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">
            ยังไม่มีสัญญาณสด — เมื่อมีความเคลื่อนไหวจะขึ้นที่นี่ทันที
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {feed.map((e) => (
              <li key={e.id} className="animate-rise rounded-xl bg-muted/50 px-3 py-2">
                <p className="text-[14px] font-extrabold">{e.title}</p>
                <p className="text-[12px] text-muted-foreground">{e.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

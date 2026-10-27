import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { MonitorPlay } from "lucide-react";

import { useStore } from "@/lib/store";
import { buildFeed, RotatingPrompt } from "@/components/live-ticker";
import { MeadowScene } from "@/components/meadow-scene";

export const Route = createFileRoute("/admin/live")({
  head: () => ({
    meta: [
      { title: "จอสดผู้ดูแล — คนส. Connexts" },
      { name: "description", content: "จอสดผู้ดูแลสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "จอสดผู้ดูแล — คนส. Connexts" },
      { property: "og:description", content: "จอสดผู้ดูแลสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
    <div className="admin-workspace admin-workspace-live">
      <MeadowScene variant="celebrate" className="admin-live-scene" />

      <Link
        to="/dashboard"
        search={{ present: "1" }}
        className="admin-live-present tap flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-extrabold text-primary-foreground"
      >
        <MonitorPlay className="h-6 w-6" aria-hidden="true" />
        เปิดจอฉายเต็มจอ
      </Link>

      <div className="admin-live-prompt card-soft rounded-2xl">
        <RotatingPrompt size="lg" tone="card" />
      </div>

      <div className="admin-live-stats">
        {[
          ["คน", users.length],
          ["คู่เชื่อม", connections.length],
          ["นัดลงมือทำ", commitments.length],
          ["ทำสำเร็จ", done],
        ].map(([label, value]) => (
          <div key={String(label)} className="admin-live-stat">
            <p className="admin-live-stat-value font-tech">{value}</p>
            <p className="admin-live-stat-label">{label}</p>
          </div>
        ))}
      </div>

      <section className="admin-live-feed">
        <div className="admin-live-feed-head">
          <h2>กำลังเชื่อมกัน</h2>
          <p>ไม่แสดงชื่อ — บอกแค่ภาคและเรื่องที่สนใจร่วมกัน</p>
        </div>
        {feed.length === 0 ? (
          <p className="admin-live-empty">รอสัญญาณแรกจากเครือข่าย</p>
        ) : (
          <ul className="admin-live-feed-list">
            {feed.slice(0, 5).map((e) => (
              <li key={e.id} className="animate-rise" title={`${e.title} — ${e.detail}`}>
                <p className="admin-live-feed-title">{e.title}</p>
                <p className="admin-live-feed-detail">{e.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

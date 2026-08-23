import { createFileRoute } from "@tanstack/react-router";
import { Radio } from "lucide-react";

import { useStore } from "@/lib/store";
import { useLiveEvents } from "@/lib/live";

export const Route = createFileRoute("/admin/live")({
  component: AdminLive,
});

function AdminLive() {
  const { users, connections, commitments } = useStore();
  const events = useLiveEvents(20);

  const done = commitments.filter((c) => c.status === "Completed").length;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-coral/15 text-coral">
          <Radio className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-[18px] font-extrabold">จอฉายกิจกรรมสด</h1>
          <p className="text-[12px] text-muted-foreground">เหมาะสำหรับขึ้นจอโปรเจกเตอร์ในงาน</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["สมาชิก", users.length],
          ["คู่เชื่อม", connections.length],
          ["คำมั่นสัญญา", commitments.length],
          ["ทำสำเร็จ", done],
        ].map(([label, value]) => (
          <div key={String(label)} className="card-soft rounded-2xl bg-card p-4 text-center">
            <p className="text-4xl font-extrabold text-gradient">{value}</p>
            <p className="text-[12px] font-bold text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-[14px] font-extrabold">ฟีดกิจกรรมสด</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">ยังไม่มีสัญญาณสด — เมื่อมีความเคลื่อนไหวจะขึ้นที่นี่ทันที</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {events.map((e) => (
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

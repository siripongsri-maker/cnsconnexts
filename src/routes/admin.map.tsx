import { MissionEmpty } from "@/components/mission-ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { issueTh, provinceTh } from "@/lib/i18n";

export const Route = createFileRoute("/admin/map")({
  head: () => ({
    meta: [
      { title: "จัดการบันทึกจังหวัด — คนส. Connexts" },
      {
        name: "description",
        content: "จัดการบันทึกจังหวัดสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:title", content: "จัดการบันทึกจังหวัด — คนส. Connexts" },
      {
        property: "og:description",
        content: "จัดการบันทึกจังหวัดสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminMap,
});

function AdminMap() {
  const { provinceNotes, users, removeProvinceNote } = useStore();
  const [q, setQ] = useState("");

  const byProvince = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((u) => counts.set(u.province, (counts.get(u.province) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [users]);

  const notes = provinceNotes.filter((n) =>
    [n.title, n.detail, n.author_name, provinceTh(n.province)]
      .join(" ")
      .toLowerCase()
      .includes(q.trim().toLowerCase()),
  );

  return (
    <div className="admin-workspace admin-workspace-map space-y-4">
      <div className="admin-section-meta">
        <span>บันทึกจากพื้นที่</span>
        <span>{provinceNotes.length} บันทึก</span>
      </div>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-title font-extrabold">จังหวัดที่มีสมาชิกมากที่สุด</h2>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {byProvince.map(([p, n]) => (
            <li
              key={p}
              className="rounded-full bg-muted px-2.5 py-1 text-body font-bold text-muted-foreground"
            >
              {provinceTh(p)} · {n}
            </li>
          ))}
        </ul>
        <Link to="/map" className="mt-3 inline-block text-body font-extrabold text-primary">
          เปิดแผนที่หน้าเว็บ →
        </Link>
      </section>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาบันทึกรายจังหวัด"
          className="w-full bg-transparent text-body placeholder:text-muted-foreground"
        />
      </div>

      {notes.length === 0 && (
        <MissionEmpty
          className="admin-empty"
          title="ไม่พบบันทึกจากพื้นที่"
          description="ลองค้นหาจังหวัดหรือคำอื่น"
        />
      )}
      <ul className="admin-records space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="card-soft flex items-start gap-3 rounded-2xl bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="break-words text-body font-extrabold">{n.title}</p>
              <p className="text-body font-bold text-muted-foreground">
                {provinceTh(n.province)} · {n.author_name} · {n.issues.map(issueTh).join(", ")}
              </p>
              <p className="mt-1 text-body text-muted-foreground">{n.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                removeProvinceNote(n.id);
                toast.success("ลบบันทึกแล้ว");
              }}
              aria-label="ลบบันทึก"
              className="tap grid size-11 shrink-0 place-items-center rounded-xl border border-destructive/40 text-destructive"
            >
              <Trash2 className="size-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

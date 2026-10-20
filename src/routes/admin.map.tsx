import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { issueTh, provinceTh } from "@/lib/i18n";

export const Route = createFileRoute("/admin/map")({
  head: () => ({ meta: [
    { title: "จัดการบันทึกจังหวัด — คนส. Connexts" },
    { name: "description", content: "จัดการบันทึกจังหวัดสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
    { property: "og:title", content: "จัดการบันทึกจังหวัด — คนส. Connexts" },
    { property: "og:description", content: "จัดการบันทึกจังหวัดสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
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
    [n.title, n.detail, n.author_name, provinceTh(n.province)].join(" ").toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[18px] font-extrabold">จัดการแผนที่พลัง</h1>
        <p className="text-[12px] text-muted-foreground">
          ดูจำนวนสมาชิกรายจังหวัด และจัดการบันทึกรายจังหวัด · {provinceNotes.length} บันทึก
        </p>
      </header>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-[14px] font-extrabold">จังหวัดที่มีสมาชิกมากที่สุด</h2>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {byProvince.map(([p, n]) => (
            <li key={p} className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
              {provinceTh(p)} · {n}
            </li>
          ))}
        </ul>
        <Link to="/map" className="mt-3 inline-block text-[12px] font-extrabold text-primary">
          เปิดแผนที่หน้าเว็บ →
        </Link>
      </section>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาบันทึกรายจังหวัด"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="card-soft flex items-start gap-3 rounded-2xl bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-extrabold">{n.title}</p>
              <p className="text-xs font-bold text-muted-foreground">
                {provinceTh(n.province)} · {n.author_name} · {n.issues.map(issueTh).join(", ")}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">{n.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                removeProvinceNote(n.id);
                toast.success("ลบบันทึกแล้ว");
              }}
              aria-label="ลบบันทึก"
              className="tap grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-destructive/40 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

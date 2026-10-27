import { MissionEmpty } from "@/components/mission-ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { STATUS_TH } from "@/lib/i18n";
import type { ConnectionStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/connections")({
  head: () => ({
    meta: [
      { title: "จัดการคู่เชื่อม — คนส. Connexts" },
      { name: "description", content: "จัดการคู่เชื่อมสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "จัดการคู่เชื่อม — คนส. Connexts" },
      {
        property: "og:description",
        content: "จัดการคู่เชื่อมสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminConnections,
});

const STATUSES: ConnectionStatus[] = ["Connected", "Planning", "In Progress", "Completed"];

function AdminConnections() {
  const { connections, users, me, setConnectionStatus, removeConnection } = useStore();
  const [filter, setFilter] = useState<ConnectionStatus | "all">("all");

  const nameOf = (id: string) =>
    id === "me" ? (me?.name ?? "ฉัน") : (users.find((u) => u.id === id)?.name ?? "ไม่ระบุ");
  const shown = connections.filter((c) => filter === "all" || c.status === filter);

  return (
    <div className="admin-workspace admin-workspace-connections space-y-4">
      <div className="admin-section-meta">
        <span>สถานะคู่เชื่อม</span>
        <span>{connections.length} คู่</span>
      </div>

      <div className="admin-filter-strip flex flex-wrap gap-1.5">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-body font-bold ${
              filter === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {filter === s && <Check className="size-4" aria-hidden="true" />}
            {s === "all" ? "ทั้งหมด" : STATUS_TH[s]}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <MissionEmpty
          className="admin-empty"
          title="ยังไม่มีคู่เชื่อมในสถานะนี้"
          description="ลองเลือกสถานะอื่น หรือรอการเชื่อมต่อใหม่"
        />
      )}
      <ul className="admin-records space-y-3">
        {shown.map((c) => (
          <li key={c.id} className="card-soft rounded-2xl bg-card p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="break-words text-body font-extrabold">
                  {nameOf(c.user_a)} ↔ {nameOf(c.user_b)}
                </p>
                <p className="text-body font-bold text-muted-foreground">
                  แมตช์ {c.match_score}% · {c.match_reason}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  removeConnection(c.id);
                  toast.success("ลบคู่เชื่อมแล้ว");
                }}
                aria-label="ลบคู่เชื่อม"
                className="tap grid size-11 shrink-0 place-items-center rounded-xl border border-destructive/40 text-destructive"
              >
                <Trash2 className="size-5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setConnectionStatus(c.id, s)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-body font-bold ${
                    c.status === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {c.status === s && <Check className="size-4" aria-hidden="true" />}
                  {STATUS_TH[s]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

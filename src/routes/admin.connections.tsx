import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { STATUS_TH } from "@/lib/i18n";
import type { ConnectionStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/connections")({
  component: AdminConnections,
});

const STATUSES: ConnectionStatus[] = ["Connected", "Planning", "In Progress", "Completed"];

function AdminConnections() {
  const { connections, users, me, setConnectionStatus, removeConnection } = useStore();
  const [filter, setFilter] = useState<ConnectionStatus | "all">("all");

  const nameOf = (id: string) => (id === "me" ? (me?.name ?? "ฉัน") : (users.find((u) => u.id === id)?.name ?? "ไม่ระบุ"));
  const shown = connections.filter((c) => filter === "all" || c.status === filter);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[18px] font-extrabold">จัดการคู่เชื่อม</h1>
        <p className="text-[12px] text-muted-foreground">ดูและปรับสถานะคู่เชื่อมทั้งงาน · {connections.length} คู่</p>
      </header>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold ${
              filter === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
            }`}
          >
            {s === "all" ? "ทั้งหมด" : STATUS_TH[s]}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {shown.map((c) => (
          <li key={c.id} className="card-soft rounded-2xl bg-card p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-extrabold">
                  {nameOf(c.user_a)} ↔ {nameOf(c.user_b)}
                </p>
                <p className="text-xs font-bold text-muted-foreground">
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
                className="tap grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-destructive/40 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setConnectionStatus(c.id, s)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                    c.status === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
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

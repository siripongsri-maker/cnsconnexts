import { MissionEmpty } from "@/components/mission-ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  CircleCheck,
  Hammer,
  Link2,
  NotebookPen,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { STATUS_TH } from "@/lib/i18n";
import type { ConnectionStatus } from "@/lib/types";
import { useAdminTitleNote } from "@/components/admin/page-head";

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

/** Status is never colour alone: each one has its own icon beside the Thai word. Display only. */
const STATUS_ICON: Record<ConnectionStatus, LucideIcon> = {
  Connected: Link2,
  Planning: NotebookPen,
  "In Progress": Hammer,
  Completed: CircleCheck,
};

function AdminConnections() {
  const { connections, users, me, setConnectionStatus, removeConnection } = useStore();
  const [filter, setFilter] = useState<ConnectionStatus | "all">("all");

  const nameOf = (id: string) =>
    id === "me" ? (me?.name ?? "ฉัน") : (users.find((u) => u.id === id)?.name ?? "ไม่ระบุ");
  const shown = connections.filter((c) => filter === "all" || c.status === filter);

  useAdminTitleNote(`(${connections.length})`);

  return (
    <div className="admin-workspace admin-workspace-connections space-y-4">
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
      <ul className="admin-connection-list">
        {shown.map((c) => {
          const a = nameOf(c.user_a);
          const b = nameOf(c.user_b);
          const StatusIcon = STATUS_ICON[c.status];
          return (
            <li key={c.id} className="admin-connection-row">
              <div className="admin-connection-main">
                <p className="admin-connection-names">
                  {a}
                  <span aria-hidden="true"> ↔ </span>
                  <span className="sr-only"> กับ </span>
                  {b}
                </p>
                <p className="admin-connection-reason" title={c.match_reason}>
                  {c.match_reason}
                </p>
              </div>
              <p className="admin-connection-score">แมตช์ {c.match_score}%</p>
              <label className="admin-status-select">
                <span className="sr-only">สถานะ</span>
                <StatusIcon className="admin-status-select-icon" aria-hidden="true" />
                <select
                  value={c.status}
                  onChange={(e) => setConnectionStatus(c.id, e.target.value as ConnectionStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_TH[s]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="admin-status-select-chevron" aria-hidden="true" />
              </label>
              <button
                type="button"
                onClick={() => {
                  removeConnection(c.id);
                  toast.success("ลบคู่เชื่อมแล้ว");
                }}
                aria-label={`ลบคู่เชื่อม ${a} กับ ${b}`}
                className="admin-icon-button tap grid size-11 shrink-0 place-items-center rounded-xl"
              >
                <Trash2 className="size-5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

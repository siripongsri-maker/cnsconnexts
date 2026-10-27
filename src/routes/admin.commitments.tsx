import { MissionEmpty } from "@/components/mission-ui";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { STATUS_TH } from "@/lib/i18n";
import { RSVP_TH, type ConnectionStatus } from "@/lib/types";
import { useAdminTitleNote } from "@/components/admin/page-head";

export const Route = createFileRoute("/admin/commitments")({
  head: () => ({
    meta: [
      { title: "จัดการคำมั่นและนัดหมาย — คนส. Connexts" },
      {
        name: "description",
        content: "จัดการคำมั่นและนัดหมายสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:title", content: "จัดการคำมั่นและนัดหมาย — คนส. Connexts" },
      {
        property: "og:description",
        content: "จัดการคำมั่นและนัดหมายสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCommitments,
});

const STATUSES: ConnectionStatus[] = ["Connected", "Planning", "In Progress", "Completed"];

function AdminCommitments() {
  const { commitments, connections, users, me, updateCommitment, removeCommitment } = useStore();

  const nameOf = (id: string) =>
    id === "me" ? (me?.name ?? "ฉัน") : (users.find((u) => u.id === id)?.name ?? "ไม่ระบุ");
  const pairOf = (connectionId: string) => {
    const c = connections.find((x) => x.id === connectionId);
    return c ? `${nameOf(c.user_a)} ↔ ${nameOf(c.user_b)}` : "ไม่พบคู่เชื่อม";
  };

  const sorted = [...commitments].sort((a, b) =>
    (a.follow_up_date ?? "9999").localeCompare(b.follow_up_date ?? "9999"),
  );

  useAdminTitleNote(`(${commitments.length})`);

  return (
    <div className="admin-workspace admin-workspace-commitments space-y-4">
      {sorted.length === 0 && (
        <MissionEmpty
          className="admin-empty"
          title="ยังไม่มีคำมั่น"
          description="นัดหมายและแผนร่วมกันจะปรากฏที่นี่"
        />
      )}
      <ul className="admin-records space-y-3">
        {sorted.map((m) => (
          <li key={m.id} className="card-soft space-y-3 rounded-2xl bg-card p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="break-words text-body font-extrabold">{pairOf(m.connection_id)}</p>
                <p className="text-body font-bold text-muted-foreground">{m.action_type}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  removeCommitment(m.id);
                  toast.success("ลบคำมั่นสัญญาแล้ว");
                }}
                aria-label="ลบคำมั่นสัญญา"
                className="tap grid size-11 shrink-0 place-items-center rounded-xl border border-destructive/40 text-destructive"
              >
                <Trash2 className="size-5" />
              </button>
            </div>

            <textarea
              rows={2}
              value={m.description}
              onChange={(e) => updateCommitment(m.id, { description: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
            />

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={m.follow_up_date ? m.follow_up_date.slice(0, 10) : ""}
                onChange={(e) => updateCommitment(m.id, { follow_up_date: e.target.value || null })}
                className="rounded-xl border border-border bg-background px-3 py-2 text-body"
              />
              <span className="rounded-full bg-muted px-2.5 py-1 text-body font-bold text-muted-foreground">
                ฉัน: {RSVP_TH[m.rsvp ?? "pending"]} · คู่: {RSVP_TH[m.partner_rsvp ?? "pending"]}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateCommitment(m.id, { status: s })}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-body font-bold ${
                    m.status === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {m.status === s && <Check className="size-4" aria-hidden="true" />}
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

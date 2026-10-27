import { MissionEmpty } from "@/components/mission-ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { issueTh, REGION_LABEL } from "@/lib/i18n";
import { ISSUES, REGIONS, type Idea, type Region } from "@/lib/types";

export const Route = createFileRoute("/admin/ideas")({
  head: () => ({
    meta: [
      { title: "จัดการไอเดีย — คนส. Connexts" },
      { name: "description", content: "จัดการไอเดียสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "จัดการไอเดีย — คนส. Connexts" },
      {
        property: "og:description",
        content: "จัดการไอเดียสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminIdeas,
});

type Draft = Pick<Idea, "title" | "description" | "region" | "issues">;

function AdminIdeas() {
  const { ideas, users, updateIdea, removeIdea } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const ownerName = (id: string) => users.find((u) => u.id === id)?.name ?? "ไม่ระบุ";

  return (
    <div className="admin-workspace admin-workspace-ideas space-y-4">
      <div className="admin-section-meta">
        <span>รายการไอเดีย</span>
        <span>{ideas.length} ไอเดีย</span>
      </div>

      {ideas.length === 0 && (
        <MissionEmpty
          className="admin-empty"
          title="ยังไม่มีไอเดีย"
          description="ไอเดียที่สมาชิกส่งเข้ามาจะปรากฏที่นี่"
        />
      )}
      <ul className="admin-records space-y-3">
        {ideas.map((idea) => {
          const editing = openId === idea.id && draft;
          return (
            <li key={idea.id} className="card-soft rounded-2xl bg-card p-4">
              {!editing ? (
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setOpenId(idea.id);
                    setDraft({
                      title: idea.title,
                      description: idea.description,
                      region: idea.region,
                      issues: [...idea.issues],
                    });
                  }}
                >
                  <p className="break-words text-body font-extrabold">{idea.title}</p>
                  <p className="mt-1 line-clamp-2 text-body text-muted-foreground">
                    {idea.description}
                  </p>
                  <p className="mt-1 text-body font-bold text-muted-foreground">
                    โดย {ownerName(idea.owner_id)} · {REGION_LABEL[idea.region]} ·{" "}
                    {idea.issues.map(issueTh).join(", ")}
                  </p>
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
                  />
                  <textarea
                    rows={3}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
                  />
                  <select
                    value={draft.region}
                    onChange={(e) => setDraft({ ...draft, region: e.target.value as Region })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {REGION_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-1.5">
                    {ISSUES.map((i) => {
                      const on = draft.issues.includes(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              issues: on
                                ? draft.issues.filter((x) => x !== i)
                                : [...draft.issues, i],
                            })
                          }
                          className={`tap inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-body ${
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {on && <Check className="size-4" aria-hidden="true" />}
                          {issueTh(i)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateIdea(idea.id, draft);
                        setOpenId(null);
                        setDraft(null);
                        toast.success("บันทึกไอเดียแล้ว");
                      }}
                      className="tap inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body font-extrabold text-primary-foreground"
                    >
                      <Save className="h-4 w-4" /> บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenId(null);
                        setDraft(null);
                      }}
                      className="rounded-xl border border-border px-4 py-2 text-body"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeIdea(idea.id);
                        setOpenId(null);
                        setDraft(null);
                        toast.success("ลบไอเดียแล้ว");
                      }}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-2 text-body text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> ลบ
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

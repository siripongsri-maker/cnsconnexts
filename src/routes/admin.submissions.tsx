import { MissionEmpty } from "@/components/mission-ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { provinceTh, REGION_LABEL } from "@/lib/i18n";
import type { Submission } from "@/lib/types";
import { useAdminTitleNote } from "@/components/admin/page-head";

export const Route = createFileRoute("/admin/submissions")({
  head: () => ({
    meta: [
      { title: "จัดการผลงาน — คนส. Connexts" },
      { name: "description", content: "จัดการผลงานสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "จัดการผลงาน — คนส. Connexts" },
      { property: "og:description", content: "จัดการผลงานสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSubmissions,
});

type Draft = Pick<Submission, "name" | "summary" | "highlight" | "wanted">;

function AdminSubmissions() {
  const { submissions, updateSubmission, removeSubmission, toggleShowcase } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  useAdminTitleNote(`(${submissions.length})`);

  return (
    <div className="admin-workspace admin-workspace-submissions space-y-4">
      {submissions.length === 0 && (
        <MissionEmpty
          className="admin-empty"
          title="ยังไม่มีผลงาน"
          description="ผลงานใหม่จะมารวมอยู่ในคลังนี้"
        />
      )}
      <ul className="admin-records space-y-3">
        {submissions.map((s) => {
          const editing = openId === s.id && draft;
          return (
            <li key={s.id} className="card-soft rounded-2xl bg-card p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-body font-extrabold">{s.name}</p>
                  <p className="text-body font-bold text-muted-foreground">
                    {s.course} · {s.batch} · {provinceTh(s.province)} · {REGION_LABEL[s.region]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleShowcase(s.id)}
                  aria-pressed={s.showcase}
                  className={`tap inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-body font-bold ${
                    s.showcase
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <Star
                    className={`size-4 ${s.showcase ? "fill-current" : ""}`}
                    aria-hidden="true"
                  />{" "}
                  ขึ้นเวที
                </button>
              </div>

              {!editing ? (
                <button
                  type="button"
                  className="mt-2 w-full text-left"
                  onClick={() => {
                    setOpenId(s.id);
                    setDraft({
                      name: s.name,
                      summary: s.summary,
                      highlight: s.highlight,
                      wanted: s.wanted,
                    });
                  }}
                >
                  <p className="line-clamp-2 text-body text-muted-foreground">{s.summary}</p>
                  <p className="mt-1 text-body font-bold text-primary">แตะเพื่อแก้ไข</p>
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  {(
                    [
                      ["ชื่อเจ้าของผลงาน", "name"],
                      ["สรุปผลงาน", "summary"],
                      ["จุดเด่น", "highlight"],
                      ["สิ่งที่อยากได้เพิ่ม", "wanted"],
                    ] as [string, keyof Draft][]
                  ).map(([label, key]) => (
                    <label key={key} className="block space-y-1">
                      <span className="text-body font-bold text-muted-foreground">{label}</span>
                      {key === "name" ? (
                        <input
                          value={draft[key]}
                          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
                        />
                      ) : (
                        <textarea
                          rows={2}
                          value={draft[key]}
                          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body"
                        />
                      )}
                    </label>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateSubmission(s.id, draft);
                        setOpenId(null);
                        setDraft(null);
                        toast.success("บันทึกผลงานแล้ว");
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
                        removeSubmission(s.id);
                        setOpenId(null);
                        setDraft(null);
                        toast.success("ลบผลงานแล้ว");
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

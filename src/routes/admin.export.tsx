import { createFileRoute } from "@tanstack/react-router";
import { Download, FileJson } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { downloadCSV, downloadJSON, type Row } from "@/lib/export";
import { provinceTh, REGION_LABEL, issueTh } from "@/lib/i18n";

export const Route = createFileRoute("/admin/export")({
  component: AdminExport,
});

function AdminExport() {
  const store = useStore();
  const { users, ideas, submissions, connections, commitments, provinceNotes } = store;

  const nameOf = (id: string) => (id === "me" ? (store.me?.name ?? "ฉัน") : (users.find((u) => u.id === id)?.name ?? id));

  const sets: { key: string; label: string; rows: Row[]; data: unknown }[] = [
    {
      key: "members",
      label: `สมาชิก (${users.length})`,
      rows: users.map((u) => ({
        ชื่อ: u.name,
        องค์กร: u.organization,
        จังหวัด: provinceTh(u.province),
        ภูมิภาค: REGION_LABEL[u.region],
        ประเด็น: u.interests.map(issueTh).join(" | "),
        คำอธิบาย: u.bio,
      })),
      data: users,
    },
    {
      key: "ideas",
      label: `ไอเดีย (${ideas.length})`,
      rows: ideas.map((i) => ({
        หัวข้อ: i.title,
        รายละเอียด: i.description,
        เจ้าของ: nameOf(i.owner_id),
        ภูมิภาค: REGION_LABEL[i.region],
        ประเด็น: i.issues.map(issueTh).join(" | "),
      })),
      data: ideas,
    },
    {
      key: "submissions",
      label: `ผลงาน (${submissions.length})`,
      rows: submissions.map((s) => ({
        ชื่อ: s.name,
        หลักสูตร: s.course,
        รุ่น: s.batch,
        จังหวัด: provinceTh(s.province),
        สรุป: s.summary,
        ขึ้นเวที: s.showcase ? "ใช่" : "ไม่",
      })),
      data: submissions,
    },
    {
      key: "connections",
      label: `คู่เชื่อม (${connections.length})`,
      rows: connections.map((c) => ({
        คนที่1: nameOf(c.user_a),
        คนที่2: nameOf(c.user_b),
        คะแนนแมตช์: c.match_score,
        สถานะ: c.status,
        เหตุผล: c.match_reason,
      })),
      data: connections,
    },
    {
      key: "commitments",
      label: `คำมั่นสัญญา (${commitments.length})`,
      rows: commitments.map((m) => ({
        ประเภท: m.action_type,
        รายละเอียด: m.description,
        วันนัด: m.follow_up_date ?? "",
        สถานะ: m.status,
      })),
      data: commitments,
    },
    {
      key: "province-notes",
      label: `บันทึกรายจังหวัด (${provinceNotes.length})`,
      rows: provinceNotes.map((n) => ({
        จังหวัด: provinceTh(n.province),
        หัวข้อ: n.title,
        รายละเอียด: n.detail,
        ผู้บันทึก: n.author_name,
      })),
      data: provinceNotes,
    },
  ];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[18px] font-extrabold">ส่งออกข้อมูล</h1>
        <p className="text-[12px] text-muted-foreground">ดาวน์โหลดเป็น CSV (เปิดใน Excel ได้) หรือ JSON</p>
      </header>

      <ul className="space-y-3">
        {sets.map((s) => (
          <li key={s.key} className="card-soft flex flex-wrap items-center gap-2 rounded-2xl bg-card p-4">
            <p className="min-w-0 flex-1 text-sm font-extrabold">{s.label}</p>
            <button
              type="button"
              onClick={() => {
                downloadCSV(`connexts-${s.key}`, s.rows);
                toast.success("ดาวน์โหลด CSV แล้ว");
              }}
              className="tap inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-bold"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={() => {
                downloadJSON(`connexts-${s.key}`, s.data);
                toast.success("ดาวน์โหลด JSON แล้ว");
              }}
              className="tap inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-bold"
            >
              <FileJson className="h-3.5 w-3.5" /> JSON
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          downloadJSON("connexts-backup-ทั้งหมด", {
            users,
            ideas,
            submissions,
            connections,
            commitments,
            provinceNotes,
          });
          toast.success("สำรองข้อมูลทั้งระบบแล้ว");
        }}
        className="tap w-full rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground"
      >
        สำรองข้อมูลทั้งระบบเป็นไฟล์เดียว (JSON)
      </button>
    </div>
  );
}

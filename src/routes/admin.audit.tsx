import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { OP_TH, OpChip } from "@/components/admin/op-chip";
import { getAdminToken } from "@/lib/admin-auth";
import { listAuditLog, type AuditRow } from "@/lib/backup.functions";
import { downloadCSV, type Row } from "@/lib/export";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "ประวัติการแก้ไข — คนส. Connexts" },
      { name: "description", content: "ประวัติการแก้ไขสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "ประวัติการแก้ไข — คนส. Connexts" },
      {
        property: "og:description",
        content: "ประวัติการแก้ไขสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAudit,
});

const TABLES = [
  { value: "", label: "ทุกตาราง" },
  { value: "participants", label: "สมาชิก" },
  { value: "ideas", label: "ไอเดีย" },
  { value: "submissions", label: "ผลงาน" },
  { value: "province_notes", label: "บันทึกจังหวัด" },
  { value: "connections", label: "คู่เชื่อม" },
  { value: "commitments", label: "คำมั่นสัญญา" },
];

const OPS = [
  { value: "", label: "ทุกการกระทำ" },
  { value: "INSERT", label: "เพิ่มใหม่" },
  { value: "UPDATE", label: "แก้ไข" },
  { value: "DELETE", label: "ลบ" },
];

const SRC_TH: Record<string, string> = {
  account: "บัญชีอีเมล",
  guest: "ผู้ใช้ทั่วไป (อุปกรณ์)",
  admin: "หลังบ้าน",
  system: "ระบบ",
};
const TABLE_TH: Record<string, string> = Object.fromEntries(
  TABLES.filter((t) => t.value).map((t) => [t.value, t.label]),
);

function AdminAudit() {
  const [table, setTable] = useState("");
  const [operation, setOperation] = useState("");
  const [actor, setActor] = useState("");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [actors, setActors] = useState<string[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAuditLog({
        data: {
          token: getAdminToken() ?? "",
          limit: 500,
          ...(table ? { table } : {}),
          ...(operation ? { operation } : {}),
          ...(actor ? { actor } : {}),
        },
      });
      setRows(res.rows as AuditRow[]);
      setActors(res.actors);
      setLastBackupAt(res.lastBackupAt);
    } catch (e) {
      toast.error("โหลดประวัติไม่สำเร็จ", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [table, operation, actor]);

  useEffect(() => {
    void load();
  }, [load]);

  const onExport = () => {
    if (!rows.length) {
      toast.error("ไม่มีรายการให้ดาวน์โหลด");
      return;
    }
    const flat: Row[] = rows.map((r) => ({
      เวลา: new Date(r.created_at).toLocaleString("th-TH"),
      ผู้ทำรายการ: r.actor ?? "-",
      ช่องทาง: SRC_TH[r.actor_source ?? ""] ?? r.actor_source ?? "-",
      ตาราง: TABLE_TH[r.table_name] ?? r.table_name,
      การกระทำ: OP_TH[r.operation] ?? r.operation,
      รายการ: r.label,
      row_id: r.row_id ?? "",
    }));
    downloadCSV("connexts-audit-log", flat);
    toast.success(`ดาวน์โหลด ${rows.length} รายการแล้ว`);
  };

  return (
    <div className="admin-workspace admin-workspace-audit space-y-4">
      <header className="admin-section-meta flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="admin-section-label">บันทึกการเปลี่ยนแปลง</p>
          <p className="text-body text-muted-foreground">
            สำรองล่าสุด {lastBackupAt ? new Date(lastBackupAt).toLocaleString("th-TH") : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-body font-bold"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />{" "}
            รีเฟรช
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-body font-bold"
          >
            <Download className="size-4" aria-hidden="true" /> ดาวน์โหลด CSV
          </button>
        </div>
      </header>

      <div className="admin-filter-strip flex flex-wrap gap-2">
        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-body"
        >
          {TABLES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-body"
        >
          {OPS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-body"
        >
          <option value="">ทุกคน</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="self-center text-body text-muted-foreground">{rows.length} รายการ</span>
      </div>

      <div
        className="admin-data-table overflow-x-auto rounded-2xl border"
        role="region"
        aria-label="ตารางประวัติการเปลี่ยนแปลงข้อมูล"
        tabIndex={0}
        data-lenis-prevent
      >
        <table className="w-full text-left text-body">
          <caption className="sr-only">ประวัติการเปลี่ยนแปลงข้อมูล</caption>
          <thead className="bg-muted/50 text-body">
            <tr>
              <th scope="col" className="p-3">
                เวลา
              </th>
              <th scope="col" className="p-3">
                ผู้ทำรายการ
              </th>
              <th scope="col" className="p-3">
                ช่องทาง
              </th>
              <th scope="col" className="p-3">
                ตาราง
              </th>
              <th scope="col" className="p-3">
                การกระทำ
              </th>
              <th scope="col" className="p-3">
                รายการ
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="whitespace-nowrap p-3 text-body text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("th-TH")}
                </td>
                <td className="p-3">{r.actor ?? "-"}</td>
                <td className="p-3 text-body text-muted-foreground">
                  {SRC_TH[r.actor_source ?? ""] ?? r.actor_source ?? "-"}
                </td>
                <td className="p-3">{TABLE_TH[r.table_name] ?? r.table_name}</td>
                <td className="p-3">
                  <OpChip op={r.operation} className="text-body font-bold" />
                </td>
                <td className="p-3">{r.label}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-body text-muted-foreground">
                  ยังไม่มีประวัติการเปลี่ยนแปลง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-body text-muted-foreground">
        หมายเหตุ: รายการก่อนเปิดใช้งานระบบบันทึกผู้ทำรายการจะไม่มีชื่อผู้ใช้กำกับ
      </p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DatabaseBackup, Download, FileJson, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { ADMIN_PASSWORD } from "@/lib/admin-auth";
import { listBackups, restoreBackup, type BackupRow } from "@/lib/backup.functions";
import { downloadCSV, downloadJSON, type Row } from "@/lib/export";

export const Route = createFileRoute("/admin/backups")({
  component: AdminBackups,
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

const OP_TH: Record<string, string> = {
  INSERT: "เพิ่มใหม่",
  UPDATE: "แก้ไข",
  DELETE: "ลบ",
};

function label(row: BackupRow) {
  const snap = (row.new_data ?? row.old_data ?? {}) as Record<string, unknown>;
  return (snap["name"] as string) || (snap["title"] as string) || row.row_id?.slice(0, 8) || "-";
}

function AdminBackups() {
  const [table, setTable] = useState("");
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBackups({
        data: { password: ADMIN_PASSWORD, ...(table ? { table } : {}) },
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      toast.error("โหลดข้อมูลสำรองไม่สำเร็จ", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    void load();
  }, [load]);

  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null);

  const onRestore = (row: BackupRow) => {
    setRestoreTarget(row);
  };

  const [exporting, setExporting] = useState(false);

  const fetchAll = async () => {
    const res = await listBackups({
      data: { password: ADMIN_PASSWORD, limit: 1000, ...(table ? { table } : {}) },
    });
    return res.rows;
  };

  const onExport = async (format: "json" | "csv") => {
    setExporting(true);
    try {
      const all = await fetchAll();
      if (!all.length) {
        toast.error("ไม่มีรายการให้ดาวน์โหลด");
        return;
      }
      const name = `connexts-backups${table ? `-${table}` : ""}`;
      if (format === "json") {
        downloadJSON(name, all);
      } else {
        const flat: Row[] = all.map((r) => ({
          id: r.id,
          ตาราง: r.table_name,
          การกระทำ: OP_TH[r.operation] ?? r.operation,
          ชื่อ: label(r),
          row_id: r.row_id ?? "",
          เวลา: new Date(r.created_at).toLocaleString("th-TH"),
          ข้อมูลเดิม: r.old_data ? JSON.stringify(r.old_data) : "",
          ข้อมูลใหม่: r.new_data ? JSON.stringify(r.new_data) : "",
        }));
        downloadCSV(name, flat);
      }
      toast.success(`ดาวน์โหลด ${all.length} รายการแล้ว`);
    } catch (e) {
      toast.error("ดาวน์โหลดไม่สำเร็จ", { description: (e as Error).message });
    } finally {
      setExporting(false);
    }
  };

  const onExportOne = (row: BackupRow) => {
    downloadJSON(`backup-${row.table_name}-${label(row)}`, row);
    toast.success("ดาวน์โหลดสแนปช็อตแล้ว");
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-extrabold">
            <DatabaseBackup className="size-5" /> สำรองข้อมูลอัตโนมัติ
          </h1>
          <p className="text-[12px] text-muted-foreground">
            ระบบบันทึกสแนปช็อตทุกครั้งที่มีการเพิ่ม แก้ไข หรือลบข้อมูล · ทั้งหมด {total} รายการ
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-border px-3 py-2 text-[12px] font-bold"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <select
        value={table}
        onChange={(e) => setTable(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
      >
        {TABLES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={exporting}
          onClick={() => void onExport("json")}
          className="tap inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[12px] font-bold disabled:opacity-60"
        >
          <FileJson className="size-4" /> ดาวน์โหลด JSON
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={() => void onExport("csv")}
          className="tap inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[12px] font-bold disabled:opacity-60"
        >
          <Download className="size-4" /> ดาวน์โหลด CSV
        </button>
      </div>

      {rows.length === 0 && !loading ? (
        <p className="rounded-2xl bg-muted p-4 text-[12px] text-muted-foreground">
          ยังไม่มีรายการสำรองข้อมูล
        </p>
      ) : null}

      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="card-soft rounded-2xl bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(openId === row.id ? null : row.id)}>
                <p className="truncate text-sm font-extrabold">{label(row)}</p>
                <p className="text-[11px] font-bold text-muted-foreground">
                  {OP_TH[row.operation] ?? row.operation} · {row.table_name} ·{" "}
                  {new Date(row.created_at).toLocaleString("th-TH")}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onExportOne(row)}
                aria-label="ดาวน์โหลดสแนปช็อตนี้"
                className="flex shrink-0 items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-bold"
              >
                <Download className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void onRestore(row)}
                className="flex shrink-0 items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-bold"
              >
                <RotateCcw className="size-3.5" /> กู้คืน
              </button>
            </div>
            {openId === row.id ? (
              <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-muted p-2 text-[10px] leading-relaxed">
                {JSON.stringify(row.old_data ?? row.new_data, null, 2)}
              </pre>
            ) : null}
          </li>
        ))}
      </ul>

      <RestoreDialog
        backupId={restoreTarget?.id ?? null}
        title={
          restoreTarget
            ? `${OP_TH[restoreTarget.operation] ?? restoreTarget.operation} · ${label(restoreTarget)}`
            : ""
        }
        onClose={() => setRestoreTarget(null)}
        onDone={() => void load()}
      />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ADMIN_PASSWORD } from "@/lib/admin-auth";
import { getBackupPolicy, pruneBackupsNow, saveBackupPolicy } from "@/lib/backup.functions";

export const Route = createFileRoute("/admin/backup-policy")({
  head: () => ({
    meta: [
      { title: "นโยบายสำรองข้อมูล — คนส. Connexts" },
      { name: "description", content: "นโยบายสำรองข้อมูลสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "นโยบายสำรองข้อมูล — คนส. Connexts" },
      {
        property: "og:description",
        content: "นโยบายสำรองข้อมูลสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminBackupPolicy,
});

function AdminBackupPolicy() {
  const [maxRows, setMaxRows] = useState(2000);
  const [maxAgeDays, setMaxAgeDays] = useState(90);
  const [autoPrune, setAutoPrune] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getBackupPolicy({ data: { password: ADMIN_PASSWORD } });
      setMaxRows(p.max_rows);
      setMaxAgeDays(p.max_age_days);
      setAutoPrune(p.auto_prune);
      setUpdatedAt(p.updated_at ?? null);
    } catch (e) {
      toast.error("โหลดนโยบายไม่สำเร็จ", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await saveBackupPolicy({
        data: { password: ADMIN_PASSWORD, maxRows, maxAgeDays, autoPrune },
      });
      toast.success("บันทึกนโยบายแล้ว", {
        description: res.removed ? `ล้างรายการเกินนโยบาย ${res.removed} รายการ` : undefined,
      });
      void load();
    } catch (e) {
      toast.error("บันทึกไม่สำเร็จ", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const onPrune = async () => {
    if (!confirm("ล้างรายการสำรองที่เกินนโยบายตอนนี้?")) return;
    try {
      const res = await pruneBackupsNow({ data: { password: ADMIN_PASSWORD } });
      toast.success(`ล้างแล้ว ${res.removed} รายการ`);
    } catch (e) {
      toast.error("ล้างไม่สำเร็จ", { description: (e as Error).message });
    }
  };

  return (
    <div className="admin-workspace admin-workspace-backup-policy space-y-4">
      <section className="card-soft space-y-4 rounded-2xl bg-card p-4">
        <label className="block space-y-1">
          <span className="text-xs font-bold text-muted-foreground">
            จำนวนรายการสำรองสูงสุด (0 = ไม่จำกัด)
          </span>
          <input
            type="number"
            min={0}
            max={100000}
            value={maxRows}
            disabled={loading}
            onChange={(e) => setMaxRows(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-muted-foreground">
            อายุสูงสุดของรายการสำรอง (วัน · 0 = ไม่จำกัด)
          </span>
          <input
            type="number"
            min={0}
            max={3650}
            value={maxAgeDays}
            disabled={loading}
            onChange={(e) => setMaxAgeDays(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoPrune}
            disabled={loading}
            onChange={(e) => setAutoPrune(e.target.checked)}
            className="size-4"
          />
          <span className="text-[13px] font-bold">ล้างรายการที่เกินนโยบายอัตโนมัติเมื่อบันทึก</span>
        </label>

        {updatedAt ? (
          <p className="text-xs text-muted-foreground">
            แก้ไขล่าสุด {new Date(updatedAt).toLocaleString("th-TH")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || loading}
            className="tap inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
          >
            <Save className="size-4" /> บันทึกนโยบาย
          </button>
          <button
            type="button"
            onClick={() => void onPrune()}
            className="tap inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-bold"
          >
            <Trash2 className="size-4" /> ล้างตอนนี้
          </button>
        </div>
      </section>

      <p className="rounded-2xl bg-muted p-3 text-[12px] leading-relaxed text-muted-foreground">
        ระบบจะเก็บรายการสำรองล่าสุดตามจำนวนที่กำหนด และลบรายการที่เก่ากว่าจำนวนวันที่ตั้งไว้
        รายการที่ถูกลบไม่สามารถกู้คืนได้ ควรส่งออกข้อมูลสำรองก่อนลดค่าลงมาก
      </p>
    </div>
  );
}

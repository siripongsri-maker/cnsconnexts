import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PlusCircle, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminToken } from "@/lib/admin-auth";
import { previewRestore, restoreBackup, type RestorePreview } from "@/lib/backup.functions";

const CONFIRM_WORD = "กู้คืน";

type Props = {
  backupId: string | null;
  title: string;
  onClose: () => void;
  onDone: () => void;
};

/** กู้คืนข้อมูลแบบยืนยัน 2 ขั้นตอน: ดูผลกระทบก่อน แล้วพิมพ์คำยืนยัน */
export function RestoreDialog({ backupId, title, onClose, onDone }: Props) {
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [word, setWord] = useState("");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!backupId) return;
    setPreview(null);
    setStep(1);
    setWord("");
    setFailure(null);
    setLoading(true);
    previewRestore({ data: { token: getAdminToken() ?? "", backupId } })
      .then((r) => setPreview(r as RestorePreview))
      .catch((e: Error) => toast.error("ตรวจสอบผลกระทบไม่สำเร็จ", { description: e.message }))
      .finally(() => setLoading(false));
  }, [backupId]);

  const confirm = async () => {
    if (!backupId) return;
    setSaving(true);
    setFailure(null);
    try {
      const res = await restoreBackup({ data: { token: getAdminToken() ?? "", backupId } });
      toast.success("กู้คืนข้อมูลสำเร็จ", {
        icon: <CheckCircle2 className="h-4 w-4" />,
        duration: 8000,
        description: `${title} · ตาราง ${res.table}${res.rowId ? ` · รหัส ${res.rowId.slice(0, 8)}` : ""} · ${
          overwrite ? "ทับข้อมูลเดิม" : "เพิ่มข้อมูลกลับ"
        } เมื่อ ${new Date(res.at).toLocaleString("th-TH")}`,
      });
      onDone();
      onClose();
    } catch (e) {
      const reason = (e as Error).message || "ไม่ทราบสาเหตุ";
      setFailure(reason);
      toast.error("กู้คืนไม่สำเร็จ", {
        icon: <XCircle className="h-4 w-4" />,
        duration: 12000,
        description: `${title} — สาเหตุ: ${reason}`,
        action: {
          label: "คัดลอกข้อผิดพลาด",
          onClick: () => void navigator.clipboard?.writeText(reason),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const overwrite = preview?.mode === "overwrite";

  return (
    <Dialog open={!!backupId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="admin-restore-dialog max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "ตรวจสอบผลกระทบก่อนกู้คืน" : "ยืนยันการกู้คืน (ขั้นที่ 2)"}
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-body text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบข้อมูลปัจจุบัน…
          </div>
        ) : !preview ? (
          <p className="py-6 text-body text-muted-foreground">ไม่พบข้อมูลสำหรับกู้คืน</p>
        ) : step === 1 ? (
          <div className="space-y-4 text-body">
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 ${
                overwrite
                  ? "border-[var(--tag-orange-bg)] bg-card"
                  : "border-[var(--tag-blue-bg)] bg-card"
              }`}
            >
              {overwrite ? (
                <AlertTriangle
                  className="mt-0.5 size-5 shrink-0 text-[var(--tag-orange-bg)]"
                  aria-hidden="true"
                />
              ) : (
                <PlusCircle
                  className="mt-0.5 size-5 shrink-0 text-[var(--tag-blue-bg)]"
                  aria-hidden="true"
                />
              )}
              <div>
                <p className="font-semibold">
                  {overwrite
                    ? "ข้อมูลปัจจุบันจะถูกทับด้วยข้อมูลสำรองนี้"
                    : "ยังไม่มีข้อมูลนี้ในระบบ จะเพิ่มกลับเข้าไปใหม่"}
                </p>
                <p className="text-muted-foreground">
                  ตาราง {preview.table} · รหัส {preview.rowId ?? "-"}
                </p>
              </div>
            </div>

            <div className="flex gap-4 text-body text-muted-foreground">
              <span>ฟิลด์ที่เปลี่ยน: {preview.changes.length}</span>
              <span>ฟิลด์ที่เหมือนเดิม: {preview.unchanged}</span>
            </div>

            {preview.changes.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-body">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2">ฟิลด์</th>
                      <th className="p-2">ค่าปัจจุบัน</th>
                      <th className="p-2">หลังกู้คืน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.changes.map((c) => (
                      <tr key={c.field} className="border-t align-top">
                        <td className="p-2 font-medium">{c.field}</td>
                        <td className="max-w-[10rem] break-words p-2 text-muted-foreground">
                          {c.current}
                        </td>
                        <td className="max-w-[10rem] break-words p-2">{c.restored}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-body">
            <p>
              พิมพ์คำว่า <span className="font-semibold">{CONFIRM_WORD}</span> เพื่อยืนยันการ
              {overwrite ? "ทับข้อมูลเดิม" : "เพิ่มข้อมูลกลับ"} จำนวน {preview.changes.length} ฟิลด์
            </p>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoFocus
            />
          </div>
        )}

        {failure && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--tag-orange-bg)] bg-card p-3 text-body">
            <XCircle
              className="mt-0.5 size-5 shrink-0 text-[var(--tag-orange-bg)]"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-[var(--tag-orange-bg)]">กู้คืนไม่สำเร็จ</p>
              <p className="break-words text-muted-foreground">สาเหตุ: {failure}</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          {preview && step === 1 && <Button onClick={() => setStep(2)}>ถัดไป</Button>}
          {preview && step === 2 && (
            <Button
              variant={overwrite ? "destructive" : "default"}
              disabled={word.trim() !== CONFIRM_WORD || saving}
              onClick={confirm}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              ยืนยันกู้คืน
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

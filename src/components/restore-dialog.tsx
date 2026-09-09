import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, PlusCircle, RotateCcw } from "lucide-react";
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
import { ADMIN_PASSWORD } from "@/lib/admin-auth";
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

  useEffect(() => {
    if (!backupId) return;
    setPreview(null);
    setStep(1);
    setWord("");
    setLoading(true);
    previewRestore({ data: { password: ADMIN_PASSWORD, backupId } })
      .then(setPreview)
      .catch((e: Error) => toast.error("ตรวจสอบผลกระทบไม่สำเร็จ", { description: e.message }))
      .finally(() => setLoading(false));
  }, [backupId]);

  const confirm = async () => {
    if (!backupId) return;
    setSaving(true);
    try {
      await restoreBackup({ data: { password: ADMIN_PASSWORD, backupId } });
      toast.success("กู้คืนข้อมูลสำเร็จ");
      onDone();
      onClose();
    } catch (e) {
      toast.error("กู้คืนไม่สำเร็จ", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const overwrite = preview?.mode === "overwrite";

  return (
    <Dialog open={!!backupId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "ตรวจสอบผลกระทบก่อนกู้คืน" : "ยืนยันการกู้คืน (ขั้นที่ 2)"}
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบข้อมูลปัจจุบัน…
          </div>
        ) : !preview ? (
          <p className="py-6 text-sm text-muted-foreground">ไม่พบข้อมูลสำหรับกู้คืน</p>
        ) : step === 1 ? (
          <div className="space-y-4 text-sm">
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 ${
                overwrite ? "border-destructive/40 bg-destructive/10" : "border-primary/40 bg-primary/10"
              }`}
            >
              {overwrite ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              ) : (
                <PlusCircle className="mt-0.5 h-4 w-4 text-primary" />
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

            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>ฟิลด์ที่เปลี่ยน: {preview.changes.length}</span>
              <span>ฟิลด์ที่เหมือนเดิม: {preview.unchanged}</span>
            </div>

            {preview.changes.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-xs">
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
          <div className="space-y-3 text-sm">
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          {preview && step === 1 && (
            <Button onClick={() => setStep(2)}>ถัดไป</Button>
          )}
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

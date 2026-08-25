import { useState } from "react";
import { CloudUpload, X } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";

/** แจ้งเตือนเมื่อพบโปรไฟล์ที่ค้างอยู่ในเครื่องและยังไม่ถูกส่งขึ้นฐานข้อมูลกลาง */
export function PendingSyncBanner() {
  const { pendingProfile, syncPendingProfile, dismissPendingProfile } = useStore();
  const [busy, setBusy] = useState(false);

  if (!pendingProfile) return null;

  const onSync = async () => {
    setBusy(true);
    try {
      await syncPendingProfile();
      toast.success("ซิงก์โปรไฟล์ขึ้นระบบเรียบร้อยแล้ว");
    } catch {
      toast.error("ซิงก์ไม่สำเร็จ ลองใหม่อีกครั้งเมื่อสัญญาณดีขึ้น");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-5 pt-3">
      <div className="flex items-start gap-3 rounded-2xl border border-coral/40 bg-coral/10 p-3.5">
        <CloudUpload className="mt-0.5 h-5 w-5 shrink-0 text-coral" strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-extrabold leading-tight">
            พบโปรไฟล์ค้างในเครื่อง ยังไม่ขึ้นระบบ
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
            โปรไฟล์ของ “{pendingProfile.name}” ถูกบันทึกไว้ในเครื่องเท่านั้น กดซิงก์เพื่อย้ายข้อมูลขึ้นฐานข้อมูลกลาง
          </p>
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={busy}
            className="tap mt-2.5 rounded-full bg-primary px-4 py-2 text-[13px] font-extrabold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "กำลังซิงก์…" : "ซิงก์ข้อมูลตอนนี้"}
          </button>
        </div>
        <button
          type="button"
          onClick={dismissPendingProfile}
          className="tap -mr-1 -mt-1 inline-grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground"
          aria-label="ปิด"
        >
          <X className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

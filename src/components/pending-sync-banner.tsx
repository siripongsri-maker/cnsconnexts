import { useState } from "react";
import { CloudUpload, Send } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";

/** ชวนให้กดส่งโปรไฟล์ที่ยังค้างอยู่ในเครื่อง — ถ้ายังไม่ส่ง คนอื่นจะยังค้นไม่เจอเรา */
export function PendingSyncBanner() {
  const { pendingProfile, syncPendingProfile, dismissPendingProfile } = useStore();
  const [busy, setBusy] = useState(false);

  if (!pendingProfile) return null;

  const onSync = async () => {
    setBusy(true);
    try {
      await syncPendingProfile();
      toast.success("ส่งแล้ว! ตอนนี้คนอื่นเจอคุณได้แล้ว");
    } catch {
      toast.error("ส่งไม่ผ่าน ลองใหม่อีกทีตอนสัญญาณดีขึ้นนะ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 lg:max-w-3xl">
      <div role="status" className="meadow-card p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky text-ink"
          >
            <CloudUpload className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lead font-semibold text-ink [overflow-wrap:anywhere]">
              โปรไฟล์ของ {pendingProfile.name} ยังรอส่ง
            </h2>
            <p className="text-body text-ink-soft">คนในงานจะเห็นคุณหลังส่งโปรไฟล์ขึ้นระบบ</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={busy}
            className="meadow-btn-primary tap flex-1"
          >
            {busy ? (
              "กำลังส่ง…"
            ) : (
              <>
                <Send className="h-6 w-6" aria-hidden /> ส่งโปรไฟล์
              </>
            )}
          </button>
          <button
            type="button"
            onClick={dismissPendingProfile}
            className="meadow-btn-secondary tap sm:w-auto"
          >
            ปิดไว้ก่อน
          </button>
        </div>
      </div>
    </div>
  );
}

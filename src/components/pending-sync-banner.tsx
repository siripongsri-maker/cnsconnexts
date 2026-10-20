import { useState } from "react";
import { CloudUpload, X } from "lucide-react";
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
    <div className="mx-auto w-full max-w-xl px-5 pt-3">
      <div className="flex items-start gap-3 rounded-2xl border border-coral/40 bg-coral/10 p-3.5">
        <CloudUpload className="mt-0.5 h-5 w-5 shrink-0 text-coral-ink" strokeWidth={2.2} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-extrabold leading-tight">
            อีกนิดเดียว! โปรไฟล์ของ “{pendingProfile.name}” ยังไม่ถูกส่ง
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
            ตอนนี้ยังไม่มีใครเห็นคุณ กดส่งเพื่อให้คนที่ควรเจอค้นเจอคุณได้
            <span lang="en" className="block">
              Others can't see you yet. Send it so people can find you.
            </span>
          </p>
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={busy}
            className="tap mt-2.5 min-h-11 rounded-full bg-primary px-4 text-[13px] font-extrabold text-primary-foreground disabled:opacity-60"
          >
            {busy ? (
              "กำลังส่ง…"
            ) : (
              <>
                ส่งโปรไฟล์ตอนนี้ · <span lang="en">Send now</span>
              </>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={dismissPendingProfile}
          className="tap -mr-2 -mt-2 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground"
          aria-label="ปิดไว้ก่อน"
        >
          <X className="h-4 w-4" strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    </div>
  );
}

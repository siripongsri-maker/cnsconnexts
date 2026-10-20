import { useState } from "react";
import { ArrowUpRight, CloudUpload, X } from "lucide-react";
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
    <div className="pending-profile-wrap">
      <div className="pending-profile-banner" role="status">
        <span className="pending-profile-icon">
          <CloudUpload className="h-5 w-5" strokeWidth={1.6} aria-hidden />
        </span>
        <div className="pending-profile-copy">
          <p className="mission-kicker">PROFILE / WAITING TO SYNC</p>
          <h2>โปรไฟล์ของ {pendingProfile.name} ยังรอส่ง</h2>
          <p>คนในงานจะเห็นคุณหลังส่งโปรไฟล์ขึ้นระบบ</p>
        </div>
        <button
          type="button"
          onClick={() => void onSync()}
          disabled={busy}
          className="tap pending-profile-send"
        >
          {busy ? (
            "กำลังส่ง…"
          ) : (
            <>
              ส่งโปรไฟล์ <ArrowUpRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
        <button
          type="button"
          onClick={dismissPendingProfile}
          className="tap pending-profile-dismiss"
          aria-label="ปิดไว้ก่อน"
        >
          <X className="h-4 w-4" strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    </div>
  );
}

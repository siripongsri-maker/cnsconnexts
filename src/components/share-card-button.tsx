import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { renderShareCard, shareOrDownload, type ShareKind } from "@/lib/share-card";
import type { MatchResult } from "@/lib/matching";
import type { User } from "@/lib/types";

export function ShareCardButton({
  me,
  matches = [],
  kind = "profile",
  label,
  className = "",
}: {
  me: User;
  matches?: MatchResult[];
  kind?: ShareKind;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const blob = await renderShareCard(me, matches, kind);
      const res = await shareOrDownload(
        blob,
        kind === "profile" ? `connexts-profile-${me.id}.png` : `connexts-matches-${me.id}.png`,
        kind === "profile" ? `โปรไฟล์พลังของ ${me.name}` : `คู่เชื่อมพลังของ ${me.name}`,
      );
      if (res === "downloaded") toast.success("บันทึกภาพแล้ว พร้อมโพสต์หรือส่งในแชท");
      if (res === "shared") toast.success("แชร์ภาพเรียบร้อย");
    } catch {
      toast.error("สร้างภาพไม่สำเร็จ ลองอีกครั้งนะ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={run}
      disabled={busy}
      className={`tap inline-flex h-10 items-center gap-1.5 rounded-2xl bg-primary px-3.5 text-[12.5px] font-extrabold text-primary-foreground disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      {label ?? (kind === "profile" ? "แชร์โปรไฟล์" : "แชร์แมตช์")}
    </button>
  );
}

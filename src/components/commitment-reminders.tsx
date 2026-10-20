import { useEffect } from "react";

import { emitLive } from "@/lib/live";
import { useStore } from "@/lib/store";

/** ระยะเตือนล่วงหน้าหลายช่วง (มิลลิวินาที) */
export const REMINDER_STAGES = [
  { key: "1d", ms: 24 * 60 * 60 * 1000, label: "ล่วงหน้า 1 วัน" },
  { key: "3h", ms: 3 * 60 * 60 * 1000, label: "ล่วงหน้า 3 ชั่วโมง" },
  { key: "30m", ms: 30 * 60 * 1000, label: "ล่วงหน้า 30 นาที" },
  { key: "due", ms: 0, label: "ถึงเวลานัด" },
] as const;

const CHECK_MS = 20_000;

/**
 * เฝ้าดูวันนัดหมายของ commitment ที่เป็นของฉัน แล้วแจ้งเตือนแบบเรียลไทม์
 * (เสียง connext + ปิ๊ง + ฟีดสด) ตามช่วงเตือนล่วงหน้า — แจ้งครั้งเดียวต่อช่วง
 */
export function CommitmentReminders() {
  const { hydrated, commitments, connections, users, notifications, notify } = useStore();

  useEffect(() => {
    if (!hydrated) return;

    const run = () => {
      const now = Date.now();
      for (const m of commitments) {
        if (!m.follow_up_date || m.status === "Completed") continue;
        const due = new Date(m.follow_up_date).getTime();
        if (Number.isNaN(due)) continue;

        const remaining = due - now;
        // เลือกช่วงเตือนที่ "ถึงแล้ว" และใกล้ที่สุด
        const stage = REMINDER_STAGES.find((s) => remaining <= s.ms);
        if (!stage) continue;
        // เลยนัดเกิน 1 วันแล้วไม่ต้องเตือนซ้ำ
        if (remaining < -24 * 60 * 60 * 1000) continue;

        const conn = connections.find((c) => c.id === m.connection_id);
        // เตือนเฉพาะนัดของฉันเอง ไม่เตือนนัดของคนอื่นในงาน
        if (!conn || (conn.user_a !== "me" && conn.user_b !== "me")) continue;

        const refId = `${m.id}:${stage.key}`;
        if (notifications.some((n) => n.kind === "reminder" && n.ref_id === refId)) continue;

        const otherId = conn.user_a === "me" ? conn.user_b : conn.user_a;
        const name = users.find((u) => u.id === otherId)?.name ?? "เพื่อนร่วมงาน";
        const when = new Date(due).toLocaleString("th-TH", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        const title =
          stage.key === "due"
            ? `ถึงเวลานัดกับ ${name} แล้ว ⏰`
            : `เตือนนัดกับ ${name} · ${stage.label} ⏰`;

        notify({
          kind: "reminder",
          title,
          body: `${m.action_type} · ${m.description} (${when})`,
          from_id: otherId,
          from_name: name,
          connection_id: m.connection_id,
          ref_id: refId,
        });

        emitLive("commitment", title, `${m.action_type} · ${when}`);
      }
    };

    run();
    const t = setInterval(run, CHECK_MS);
    return () => clearInterval(t);
  }, [hydrated, commitments, connections, users, notifications, notify]);

  return null;
}

import { useEffect } from "react";

import { useStore } from "@/lib/store";

/** วันนัดหมายถึงกำหนดภายในกี่ชั่วโมงจึงเตือน (เตือนล่วงหน้า 1 วัน) */
const LEAD_MS = 24 * 60 * 60 * 1000;
const CHECK_MS = 60_000;

/**
 * เฝ้าดูวันนัดหมายของ commitment แล้วส่งการแจ้งเตือน (เสียง connext + ปิ๊ง)
 * เมื่อถึงเวลานัด — แจ้งครั้งเดียวต่อรายการด้วย ref_id
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
        if (Number.isNaN(due) || due - now > LEAD_MS) continue;
        if (notifications.some((n) => n.kind === "reminder" && n.ref_id === m.id)) continue;

        const conn = connections.find((c) => c.id === m.connection_id);
        const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
        const name = users.find((u) => u.id === otherId)?.name ?? "เพื่อนร่วมงาน";
        const overdue = due <= now;

        notify({
          kind: "reminder",
          title: overdue ? `ถึงเวลานัดกับ ${name} แล้ว ⏰` : `ใกล้ถึงนัดกับ ${name} พรุ่งนี้ ⏰`,
          body: `${m.action_type} · ${m.description}`,
          from_id: otherId,
          from_name: name,
          connection_id: m.connection_id,
          ref_id: m.id,
        });
      }
    };

    run();
    const t = setInterval(run, CHECK_MS);
    return () => clearInterval(t);
  }, [hydrated, commitments, connections, users, notifications, notify]);

  return null;
}

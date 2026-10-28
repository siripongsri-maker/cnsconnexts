import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, KeyRound, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { ROLE_TH, useAdminAuth } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่าผู้ดูแล — คนส. Connexts" },
      { name: "description", content: "ตั้งค่าผู้ดูแลสำหรับกิจกรรมและเครือข่าย คนส. Connexts" },
      { property: "og:title", content: "ตั้งค่าผู้ดูแล — คนส. Connexts" },
      {
        property: "og:description",
        content: "ตั้งค่าผู้ดูแลสำหรับกิจกรรมและเครือข่าย คนส. Connexts",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const { reset, users, ideas, connections, commitments } = useStore();
  const { user, role } = useAdminAuth();

  return (
    <div className="admin-workspace admin-workspace-settings space-y-4">
      <section className="card-soft space-y-2 rounded-2xl bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-title font-extrabold">
          <KeyRound className="size-5 text-primary" aria-hidden="true" /> บัญชีผู้ดูแล
        </h2>
        <p className="text-body text-muted-foreground">
          เข้าสู่ระบบอยู่ในชื่อ{" "}
          <span className="font-extrabold text-foreground">{user ?? "—"}</span>
          {role ? <> · {ROLE_TH[role]}</> : null}
        </p>
        <p className="text-body text-muted-foreground">
          รหัสผ่านผู้ดูแลตั้งค่าที่ตัวแปรสภาพแวดล้อมของเซิร์ฟเวอร์ (SUPERADMIN_PASSWORD,
          ADMIN_PASSWORD, ANALYST_PASSWORD, VIEWER_PASSWORD) และไม่แสดงบนหน้าเว็บ ดูวิธีตั้งค่าใน
          docs/ADMIN.md
        </p>
      </section>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-title font-extrabold">สรุปข้อมูลปัจจุบัน</h2>
        <p className="mt-1 text-body text-muted-foreground">
          สมาชิก {users.length} · ไอเดีย {ideas.length} · คู่เชื่อม {connections.length} ·
          คำมั่นสัญญา {commitments.length}
        </p>
      </section>

      <section className="card-soft space-y-3 rounded-2xl border border-destructive/30 bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-title font-extrabold text-destructive">
          <AlertTriangle className="size-5" aria-hidden="true" /> โซนอันตราย
        </h2>
        <p className="text-body text-muted-foreground">
          ล้างค่าที่เก็บในเครื่องนี้ (รายการถูกใจ ที่ข้าม และการแจ้งเตือน)
          ข้อมูลกลางบนฐานข้อมูลจะไม่ถูกลบ
        </p>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("ยืนยันล้างค่าที่เก็บในเครื่องนี้?")) return;
            reset();
            toast.success("ล้างค่าในเครื่องเรียบร้อย");
          }}
          className="tap inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-body font-extrabold text-destructive-foreground"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> ล้างค่าในเครื่องนี้
        </button>
      </section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, KeyRound, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { ADMIN_PASSWORD, ADMIN_USER } from "@/lib/admin-auth";

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

  return (
    <div className="admin-workspace admin-workspace-settings space-y-4">
      <section className="card-soft space-y-2 rounded-2xl bg-card p-4">
        <h2 className="inline-flex items-center gap-1.5 text-[14px] font-extrabold">
          <KeyRound className="h-4 w-4 text-primary" /> บัญชีผู้ดูแล
        </h2>
        <p className="text-[13px] text-muted-foreground">
          ผู้ใช้: <span className="font-extrabold text-foreground">{ADMIN_USER}</span> · รหัสผ่าน:{" "}
          <span className="font-extrabold text-foreground">{ADMIN_PASSWORD}</span>
        </p>
        <p className="text-[12px] text-muted-foreground">
          บัญชีนี้ใช้สำหรับเดโม่และป้องกันเฉพาะหน้าจอ
        </p>
      </section>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-[14px] font-extrabold">สรุปข้อมูลปัจจุบัน</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          สมาชิก {users.length} · ไอเดีย {ideas.length} · คู่เชื่อม {connections.length} ·
          คำมั่นสัญญา {commitments.length}
        </p>
      </section>

      <section className="card-soft space-y-3 rounded-2xl border border-destructive/30 bg-card p-4">
        <h2 className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-destructive">
          <AlertTriangle className="h-4 w-4" /> โซนอันตราย
        </h2>
        <p className="text-[12px] text-muted-foreground">
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
          className="tap inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-sm font-extrabold text-destructive-foreground"
        >
          <RotateCcw className="h-4 w-4" /> ล้างค่าในเครื่องนี้
        </button>
      </section>
    </div>
  );
}

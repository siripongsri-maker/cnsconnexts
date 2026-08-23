import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, KeyRound, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { ADMIN_PASSWORD, ADMIN_USER } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { reset, users, ideas, connections, commitments } = useStore();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[18px] font-extrabold">ตั้งค่าระบบหลังบ้าน</h1>
        <p className="text-[12px] text-muted-foreground">ข้อมูลบัญชีผู้ดูแลและการล้างข้อมูลเดโม่</p>
      </header>

      <section className="card-soft space-y-2 rounded-2xl bg-card p-4">
        <h2 className="inline-flex items-center gap-1.5 text-[14px] font-extrabold">
          <KeyRound className="h-4 w-4 text-primary" /> บัญชีผู้ดูแล
        </h2>
        <p className="text-[13px] text-muted-foreground">
          ผู้ใช้: <span className="font-extrabold text-foreground">{ADMIN_USER}</span> · รหัสผ่าน:{" "}
          <span className="font-extrabold text-foreground">{ADMIN_PASSWORD}</span>
        </p>
        <p className="text-[12px] text-muted-foreground">
          รหัสนี้เป็นการป้องกันระดับหน้าจอสำหรับเดโม่เท่านั้น ข้อมูลทั้งหมดเก็บในเครื่องผู้ใช้ (localStorage)
        </p>
      </section>

      <section className="card-soft rounded-2xl bg-card p-4">
        <h2 className="text-[14px] font-extrabold">สรุปข้อมูลปัจจุบัน</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          สมาชิก {users.length} · ไอเดีย {ideas.length} · คู่เชื่อม {connections.length} · คำมั่นสัญญา{" "}
          {commitments.length}
        </p>
      </section>

      <section className="card-soft space-y-3 rounded-2xl border border-destructive/30 bg-card p-4">
        <h2 className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-destructive">
          <AlertTriangle className="h-4 w-4" /> โซนอันตราย
        </h2>
        <p className="text-[12px] text-muted-foreground">
          รีเซ็ตข้อมูลทั้งหมดกลับเป็นชุดเดโม่เริ่มต้น การกระทำนี้ย้อนกลับไม่ได้
        </p>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("ยืนยันรีเซ็ตข้อมูลทั้งหมดกลับเป็นชุดเดโม่?")) return;
            reset();
            toast.success("รีเซ็ตข้อมูลเรียบร้อย");
          }}
          className="tap inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-sm font-extrabold text-destructive-foreground"
        >
          <RotateCcw className="h-4 w-4" /> รีเซ็ตข้อมูลทั้งหมด
        </button>
      </section>
    </div>
  );
}

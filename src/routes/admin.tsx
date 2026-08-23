import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Download,
  FileUp,
  Handshake,
  Home,
  LayoutDashboard,
  Lightbulb,
  Lock,
  LogOut,
  Map,
  Monitor,
  QrCode,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { ROLE_TH, useAdminAuth } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "หลังบ้านผู้ดูแล — คนส. Connexts" },
      {
        name: "description",
        content: "ระบบหลังบ้านสำหรับผู้ดูแลงาน จัดการสมาชิก ไอเดีย ผลงาน คู่เชื่อม และข้อมูลกิจกรรมทั้งหมด",
      },
      { property: "og:title", content: "หลังบ้านผู้ดูแล — คนส. Connexts" },
      { property: "og:description", content: "จัดการข้อมูลกิจกรรมทั้งหมดในที่เดียว" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

export const ADMIN_MENU = [
  { to: "/admin", label: "ภาพรวม", icon: LayoutDashboard, exact: true },
  { to: "/admin/people", label: "สมาชิก", icon: Users },
  { to: "/admin/import", label: "นำเข้า CSV", icon: FileUp },
  { to: "/admin/ideas", label: "ไอเดีย", icon: Lightbulb },
  { to: "/admin/submissions", label: "ผลงาน", icon: BookOpen },
  { to: "/admin/map", label: "แผนที่", icon: Map },
  { to: "/admin/connections", label: "คู่เชื่อม", icon: Handshake },
  { to: "/admin/commitments", label: "คำมั่น/ปฏิทิน", icon: CalendarDays },
  { to: "/admin/live", label: "จอสด", icon: Monitor },
  { to: "/admin/qr", label: "QR/ป้าย", icon: QrCode },
  { to: "/admin/logs", label: "Log การใช้งาน", icon: ShieldCheck },
  { to: "/admin/export", label: "ส่งออกข้อมูล", icon: Download },
  { to: "/admin/settings", label: "ตั้งค่า", icon: Settings },
] as const;

function AdminLayout() {
  const { ready, authed, role, user: adminUser, signIn, signOut } = useAdminAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (!ready) {
    return <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">กำลังเชื่อม…</div>;
  }

  if (!authed) {
    return (
      <main className="grid min-h-dvh place-items-center bg-muted/40 px-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!signIn(user, password)) setError(true);
          }}
          className="card-soft w-full max-w-sm space-y-4 rounded-3xl bg-card p-6"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-[16px] font-extrabold">หลังบ้านผู้ดูแล</h1>
              <p className="text-[12px] text-muted-foreground">คนส. Connexts</p>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-muted-foreground">ชื่อผู้ใช้</span>
            <input
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                setError(false);
              }}
              autoComplete="username"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-muted-foreground">รหัสผ่าน</span>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
            />
          </label>

          {error && <p className="text-[12px] font-bold text-destructive">ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง</p>}

          <button
            type="submit"
            className="tap w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground"
          >
            เข้าสู่ระบบผู้ดูแล
          </button>

          <p className="rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
            บทบาท: <b>ผู้ดูแลสูงสุด</b> ดู/ค้นหา/ส่งออก/ล้าง Log ได้ทั้งหมด ·{" "}
            <b>นักวิเคราะห์</b> ดู ค้นหา และส่งออกได้ · <b>ผู้ชม</b> ดูได้อย่างเดียว
          </p>

          <Link to="/" className="block text-center text-[12px] font-bold text-muted-foreground">
            ← กลับหน้าแรก
          </Link>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" aria-label="กลับหน้าแรก" className="tap grid h-9 w-9 place-items-center rounded-xl bg-muted">
            <Home className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold">หลังบ้านผู้ดูแล</p>
            <p className="truncate text-[11px] text-muted-foreground">
              คนส. Connexts · {adminUser ?? "-"} · {role ? ROLE_TH[role] : "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="tap ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-bold"
          >
            <LogOut className="h-3.5 w-3.5" /> ออกจากระบบ
          </button>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-4 pb-3">
          {ADMIN_MENU.map(({ to, label, icon: Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest ? Boolean(rest.exact) : false }}
              activeProps={{ className: "border-primary bg-primary/10 text-primary" }}
              className="tap inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-bold text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <Outlet />
      </main>
    </div>
  );
}

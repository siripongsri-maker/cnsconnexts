import {
  BookOpen,
  CalendarDays,
  Coins,
  DatabaseBackup,
  Download,
  FileUp,
  Handshake,
  History as HistoryIcon,
  Lightbulb,
  LayoutDashboard,
  Map,
  Monitor,
  QrCode,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Active only on the exact path (the overview, which is the parent of every other admin route). */
  exact?: boolean;
};

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

/** Sidebar of /admin: 18 routes in four Thai groups. No item is hidden by role (as before). */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "ภาพรวม",
    items: [
      { to: "/admin", label: "ภาพรวม", icon: LayoutDashboard, exact: true },
      { to: "/admin/live", label: "จอสด", icon: Monitor },
      { to: "/admin/map", label: "แผนที่", icon: Map },
    ],
  },
  {
    label: "ผู้คนและคู่",
    items: [
      { to: "/admin/people", label: "สมาชิก", icon: Users },
      { to: "/admin/connections", label: "คู่เชื่อม", icon: Handshake },
      { to: "/admin/commitments", label: "คำมั่น/ปฏิทิน", icon: CalendarDays },
      { to: "/admin/ideas", label: "ไอเดีย", icon: Lightbulb },
      { to: "/admin/submissions", label: "ผลงาน", icon: BookOpen },
    ],
  },
  {
    label: "ข้อมูลและไฟล์",
    items: [
      { to: "/admin/import", label: "นำเข้า CSV", icon: FileUp },
      { to: "/admin/export", label: "ส่งออกข้อมูล", icon: Download },
      { to: "/admin/qr", label: "QR/ป้าย", icon: QrCode },
      { to: "/admin/backups", label: "สำรองข้อมูล", icon: DatabaseBackup },
      { to: "/admin/backup-policy", label: "นโยบายสำรอง", icon: ShieldCheck },
    ],
  },
  {
    label: "ระบบ",
    items: [
      { to: "/admin/logs", label: "บันทึกการใช้งาน", icon: ShieldCheck },
      { to: "/admin/audit", label: "ประวัติการแก้ไข", icon: HistoryIcon },
      { to: "/admin/costs", label: "สรุปค่าใช้จ่าย", icon: Coins },
      { to: "/admin/settings", label: "ตั้งค่า", icon: Settings },
      { to: "/journey", label: "เส้นทางทุกหน้า", icon: Map },
    ],
  },
];

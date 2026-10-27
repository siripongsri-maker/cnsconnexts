import { describe, expect, it } from "vitest";
import { ADMIN_NAV_GROUPS } from "./admin-nav";

// เส้นทางทั้ง 18 รายการของเมนูเดิม (ลำดับเดิมใน admin.tsx ก่อนแบ่งกลุ่ม)
const PREVIOUS_ROUTES = [
  "/admin",
  "/admin/people",
  "/admin/import",
  "/admin/ideas",
  "/admin/submissions",
  "/admin/map",
  "/admin/connections",
  "/admin/commitments",
  "/admin/live",
  "/admin/qr",
  "/admin/logs",
  "/admin/backups",
  "/admin/backup-policy",
  "/admin/audit",
  "/admin/export",
  "/admin/costs",
  "/admin/settings",
  "/journey",
];

describe("ADMIN_NAV_GROUPS", () => {
  it("has the four Thai groups in order", () => {
    expect(ADMIN_NAV_GROUPS.map((g) => g.label)).toEqual([
      "ภาพรวม",
      "ผู้คนและคู่",
      "ข้อมูลและไฟล์",
      "ระบบ",
    ]);
  });

  it("keeps all 18 previous routes, each exactly once", () => {
    const flat = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to));
    expect(flat).toHaveLength(18);
    expect(new Set(flat).size).toBe(18);
    expect([...flat].sort()).toEqual([...PREVIOUS_ROUTES].sort());
  });

  it("lists the items of each group in the agreed order with Thai labels", () => {
    const byGroup = Object.fromEntries(
      ADMIN_NAV_GROUPS.map((g) => [g.label, g.items.map((i) => `${i.to} ${i.label}`)]),
    );
    expect(byGroup).toEqual({
      ภาพรวม: ["/admin ภาพรวม", "/admin/live จอสด", "/admin/map แผนที่"],
      ผู้คนและคู่: [
        "/admin/people สมาชิก",
        "/admin/connections คู่เชื่อม",
        "/admin/commitments คำมั่น/ปฏิทิน",
        "/admin/ideas ไอเดีย",
        "/admin/submissions ผลงาน",
      ],
      ข้อมูลและไฟล์: [
        "/admin/import นำเข้า CSV",
        "/admin/export ส่งออกข้อมูล",
        "/admin/qr QR/ป้าย",
        "/admin/backups สำรองข้อมูล",
        "/admin/backup-policy นโยบายสำรอง",
      ],
      ระบบ: [
        "/admin/logs บันทึกการใช้งาน",
        "/admin/audit ประวัติการแก้ไข",
        "/admin/costs สรุปค่าใช้จ่าย",
        "/admin/settings ตั้งค่า",
        "/journey เส้นทางทุกหน้า",
      ],
    });
  });

  it("marks only the overview as an exact match and gives every item an icon", () => {
    const items = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
    expect(items.filter((i) => i.exact).map((i) => i.to)).toEqual(["/admin"]);
    for (const item of items) expect(item.icon).toBeTruthy();
  });

  it("uses no English words in labels except CSV and QR", () => {
    const labels = ADMIN_NAV_GROUPS.flatMap((g) => [g.label, ...g.items.map((i) => i.label)]);
    for (const label of labels) {
      const words = label.match(/[A-Za-z]{4,}/g) ?? [];
      expect(words, label).toEqual([]);
    }
  });
});

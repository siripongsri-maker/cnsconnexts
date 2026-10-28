import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isNavActive } from "@/components/bottom-nav";

describe("NAV_ITEMS", () => {
  it("มี 5 เมนูตามลำดับ จับคู่ · คู่ของฉัน · สำรวจ · โปรเจกต์ · ฉัน", () => {
    expect(NAV_ITEMS.map((n) => n.label)).toEqual([
      "จับคู่",
      "คู่ของฉัน",
      "สำรวจ",
      "โปรเจกต์",
      "ฉัน",
    ]);
  });

  it("ปลายทางตรงตามสเปก", () => {
    expect(NAV_ITEMS.map((n) => n.to)).toEqual([
      "/",
      "/commitments",
      "/map",
      "/projects",
      "/update",
    ]);
  });

  it("โปรเจกต์เข้าหมวดของตัวเอง ไม่ดืมไปกัับหมวดอื่น", () => {
    const projects = NAV_ITEMS.find((n) => n.to === "/projects");
    expect(projects?.match).toEqual(["/projects"]);
    expect(isNavActive("/projects", ["/map", "/marketplace"])).toBe(false);
  });
});

describe("isNavActive", () => {
  const match = ["/", "/matches", "/people"] as const;

  it("'/' ตรงเฉพาะหน้าแรก", () => {
    expect(isNavActive("/", match)).toBe(true);
    expect(isNavActive("/map", match)).toBe(false);
  });

  it("เส้นทางย่อยนับอยู่ในหมวด", () => {
    expect(isNavActive("/people/x", match)).toBe(true);
    expect(isNavActive("/matches", match)).toBe(true);
  });

  it("ไม่นับคำนำหน้าที่ไม่ใช่ segment เต็ม", () => {
    expect(isNavActive("/peopleX", match)).toBe(false);
  });

  it("หมวดสำรวจและฉัน", () => {
    expect(isNavActive("/marketplace", ["/map", "/marketplace"])).toBe(true);
    expect(isNavActive("/dashboard", ["/update", "/notifications", "/dashboard"])).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { relevanceOf, sortScored, type Scored } from "./relevance";
import type { Region, User } from "./types";
import type { DashboardFilters } from "./filter-presets";

const mk = (id: string, region: string): User => ({
  id,
  name: `คน ${id}`,
  avatar: "",
  province: "",
  // ข้อมูลจริงบางแถวมีค่าภาคที่ไม่อยู่ในรายการ (พิมพ์ผิด/ค่าว่าง/null)
  region: region as Region,
  organization: "",
  generation: "Millennial",
  bio: "",
  interests: [],
  powers_have: [],
  powers_need: [],
  created_at: "2026-10-01T00:00:00Z",
});

const scored = (u: User): Scored => ({ user: u, relevance: 50, match: null, reasons: [] });

describe("sortScored by region", () => {
  it("does not throw when a participant has an unknown region", () => {
    const list = [mk("a", "South"), mk("b", "Mars"), mk("c", "North"), mk("d", "")].map(scored);
    expect(() => sortScored(list, "region")).not.toThrow();
  });

  it("orders known regions by Thai label and puts unknown regions last", () => {
    const list = [mk("bad", "Mars"), mk("s", "South"), mk("n", "North")].map(scored);
    const ids = sortScored(list, "region").map((s) => s.user.id);
    expect(ids[ids.length - 1]).toBe("bad");
    expect(ids.slice(0, 2).sort()).toEqual(["n", "s"]);
  });

  it("survives a null region", () => {
    const u = { ...mk("x", "North"), region: null as unknown as Region };
    expect(() => sortScored([scored(u), scored(mk("y", "North"))], "region")).not.toThrow();
  });
});

describe("relevanceOf region reason", () => {
  it("names the region in the reason when it matches the filter", () => {
    const f = {
      q: "",
      region: "North",
      issue: "all",
      power: "all",
      powerMode: "any",
    } as unknown as DashboardFilters;
    expect(relevanceOf(mk("a", "North"), f, null).reasons).toContain("อยู่ภาคเหนือ");
  });
});

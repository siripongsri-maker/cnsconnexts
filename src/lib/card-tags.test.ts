import { describe, expect, it } from "vitest";
import { orderPowers, pickTags } from "./card-tags";

describe("pickTags", () => {
  it("puts shared issues first, then the rest, and counts the overflow", () => {
    expect(pickTags(["Policy", "Youth", "Environment"], ["Youth"])).toEqual({
      shown: ["Youth", "Policy"],
      more: 1,
    });
  });

  it("returns nothing when they have no issues", () => {
    expect(pickTags([], ["Youth"])).toEqual({ shown: [], more: 0 });
  });

  it("shows everything when under the max", () => {
    expect(pickTags(["A", "B"], [], 2)).toEqual({ shown: ["A", "B"], more: 0 });
  });
});

describe("orderPowers", () => {
  it("keeps every power so the card's +N counts the full list", () => {
    const all = ["Ideas", "Knowledge", "Technology", "Partnership"];
    // scoreMatch ส่ง theyBring มาแค่ 2 อัน — +N ต้องนับจากทั้งหมด (4 → +3)
    expect(orderPowers(all, ["Technology", "Ideas"])).toHaveLength(4);
  });

  it("puts the most relevant powers first, in their relevance order", () => {
    const all = ["Ideas", "Knowledge", "Technology", "Partnership"];
    expect(orderPowers(all, ["Technology", "Ideas"])).toEqual([
      "Technology",
      "Ideas",
      "Knowledge",
      "Partnership",
    ]);
  });

  it("ignores relevant powers the person does not list and never duplicates", () => {
    expect(
      orderPowers(["Ideas", "Knowledge"], ["Funding / Resources", "Knowledge", "Knowledge"]),
    ).toEqual(["Knowledge", "Ideas"]);
  });

  it("returns the person's own order when nothing is relevant (guests)", () => {
    expect(orderPowers(["Ideas", "Knowledge"], [])).toEqual(["Ideas", "Knowledge"]);
  });
});

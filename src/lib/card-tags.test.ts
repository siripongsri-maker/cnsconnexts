import { describe, expect, it } from "vitest";
import { pickTags } from "./card-tags";

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

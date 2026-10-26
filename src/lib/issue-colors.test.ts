import { describe, expect, it } from "vitest";
import { ISSUES, POWERS } from "@/lib/types";
import { BLOCK_TAG, ISSUE_BLOCK, POWER_ICON, blockFor, contrastRatio } from "@/lib/issue-colors";

describe("issue-colors", () => {
  it("maps every issue to a block colour", () => {
    for (const i of ISSUES) expect(ISSUE_BLOCK[i]).toBeTruthy();
    expect(ISSUE_BLOCK["LGBTQ+"]).toBe("purple");
    expect(ISSUE_BLOCK["Policy"]).toBe("blue");
    expect(ISSUE_BLOCK["Silver Age"]).toBe("yellow");
    expect(ISSUE_BLOCK["Environment"]).toBe("green");
    expect(ISSUE_BLOCK["Mental Health"]).toBe("teal");
    expect(ISSUE_BLOCK["Youth"]).toBe("orange");
  });
  it("falls back to orange for unknown issues", () => {
    expect(blockFor("Something new")).toBe("orange");
  });
  it("every tag pair passes WCAG AA 4.5:1", () => {
    for (const { bg, fg } of Object.values(BLOCK_TAG))
      expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
  });
  it("has an icon for every power", () => {
    for (const p of POWERS) expect(POWER_ICON[p.key]).toBeTruthy();
  });
});

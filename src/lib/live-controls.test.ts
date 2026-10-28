import { describe, expect, it } from "vitest";
import { DEFAULT_CONTROL_STATE, edgeMatchesIssue, scaleTiming } from "./live-controls";

describe("live-controls", () => {
  it("default state is country, normal, no issue, moving, bubbles on", () => {
    expect(DEFAULT_CONTROL_STATE).toEqual({
      speed: "normal",
      view: { kind: "country" },
      issue: null,
      motion: "moving",
      bubbles: true,
    });
  });

  it("scaleTiming: fast shortens and slow lengthens", () => {
    expect(scaleTiming(2400, "fast")).toBe(1440);
    expect(scaleTiming(2400, "slow")).toBe(3600);
    expect(scaleTiming(2400, "normal")).toBe(2400);
  });

  const issuesById = new Map<string, readonly string[]>([
    ["a", ["Youth"]],
    ["b", []],
  ]);
  const edge = { sourceId: "a", targetId: "b" };

  it("edgeMatchesIssue: null matches everything", () => {
    expect(edgeMatchesIssue(edge, issuesById, null)).toBe(true);
  });

  it("edgeMatchesIssue: either endpoint matches", () => {
    expect(edgeMatchesIssue(edge, issuesById, "Youth")).toBe(true);
    expect(edgeMatchesIssue({ sourceId: "b", targetId: "a" }, issuesById, "Youth")).toBe(true);
    expect(edgeMatchesIssue(edge, issuesById, "Policy")).toBe(false);
  });

  it("edgeMatchesIssue: neither endpoint matches → false", () => {
    expect(edgeMatchesIssue({ sourceId: "b", targetId: "zzz" }, issuesById, "Youth")).toBe(false);
  });
});

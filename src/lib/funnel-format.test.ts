import { describe, expect, it } from "vitest";
import { stepChangeLabel } from "./funnel-format";

describe("stepChangeLabel", () => {
  it("gives the share of the previous step", () => {
    expect(stepChangeLabel(5, 10)).toBe("50% จากขั้นก่อน");
    expect(stepChangeLabel(2, 3)).toBe("67% จากขั้นก่อน");
  });

  it("says 100% when the step keeps everyone", () => {
    expect(stepChangeLabel(7, 7)).toBe("100% จากขั้นก่อน");
  });

  it("says in words when a step has more people than the previous one", () => {
    expect(stepChangeLabel(12, 10)).toBe("มากกว่าขั้นก่อน");
    expect(stepChangeLabel(3, 0)).toBe("มากกว่าขั้นก่อน");
  });

  it("gives 0% when both steps are empty", () => {
    expect(stepChangeLabel(0, 0)).toBe("0% จากขั้นก่อน");
  });
});

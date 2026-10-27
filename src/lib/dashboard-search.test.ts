import { describe, expect, it } from "vitest";
import { z } from "zod";
import { presentParam } from "./dashboard-search";

const schema = z.object({ present: presentParam });

describe("presentParam", () => {
  it("accepts the number 1 that the router makes of ?present=1", () => {
    expect(schema.parse({ present: 1 }).present).toBe("1");
  });
  it('accepts the string "1" that the in-app link writes', () => {
    expect(schema.parse({ present: "1" }).present).toBe("1");
  });
  it("is undefined when missing", () => {
    expect(schema.parse({}).present).toBeUndefined();
  });
  it("is undefined for anything else", () => {
    expect(schema.parse({ present: "x" }).present).toBeUndefined();
    expect(schema.parse({ present: 2 }).present).toBeUndefined();
    expect(schema.parse({ present: "0" }).present).toBeUndefined();
  });
});

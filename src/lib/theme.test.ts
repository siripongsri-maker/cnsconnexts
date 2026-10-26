import { describe, expect, it } from "vitest";
import { themeClassFor } from "./theme";

describe("themeClassFor", () => {
  it("gives participant routes the meadow theme", () => {
    expect(themeClassFor("/")).toBe("meadow");
    expect(themeClassFor("/map")).toBe("meadow");
  });

  it("leaves the admin back office on its own theme", () => {
    expect(themeClassFor("/admin")).toBeUndefined();
    expect(themeClassFor("/admin/people")).toBeUndefined();
  });

  it("only matches the admin segment, not paths that start with the same letters", () => {
    expect(themeClassFor("/administrator")).toBe("meadow");
  });
});

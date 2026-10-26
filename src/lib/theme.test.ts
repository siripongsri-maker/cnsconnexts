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

  it("leaves the print kit on its own theme so A0/A4 sheets do not reflow", () => {
    expect(themeClassFor("/print")).toBeUndefined();
    expect(themeClassFor("/print/board")).toBeUndefined();
    expect(themeClassFor("/printer")).toBe("meadow");
  });

  it("leaves internal pages (journey, brand preview) on their own theme", () => {
    expect(themeClassFor("/journey")).toBeUndefined();
    expect(themeClassFor("/journey/step")).toBeUndefined();
    expect(themeClassFor("/brand-preview")).toBeUndefined();
    expect(themeClassFor("/brand-preview/logo")).toBeUndefined();
    expect(themeClassFor("/journeys")).toBe("meadow");
  });
});

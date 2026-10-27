import { describe, expect, it } from "vitest";
import { isParticipantRoute, themeClassFor } from "./theme";

describe("themeClassFor", () => {
  it("gives participant routes the meadow theme", () => {
    expect(themeClassFor("/")).toBe("meadow");
    expect(themeClassFor("/map")).toBe("meadow");
  });

  it("gives the admin back office the meadow theme with the work density layer", () => {
    expect(themeClassFor("/admin")).toBe("meadow meadow-work");
    expect(themeClassFor("/admin/people")).toBe("meadow meadow-work");
  });

  it("only matches the admin segment, not paths that start with the same letters", () => {
    expect(themeClassFor("/administrator")).toBe("meadow");
  });

  it("leaves the print kit on its own theme so A0/A4 sheets do not reflow", () => {
    expect(themeClassFor("/print")).toBeUndefined();
    expect(themeClassFor("/print/a4")).toBeUndefined();
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

describe("isParticipantRoute", () => {
  it("is true on participant pages", () => {
    expect(isParticipantRoute("/")).toBe(true);
    expect(isParticipantRoute("/administrator")).toBe(true);
  });

  it("is false on the admin back office, print kit and internal pages", () => {
    expect(isParticipantRoute("/admin")).toBe(false);
    expect(isParticipantRoute("/admin/live")).toBe(false);
    expect(isParticipantRoute("/print")).toBe(false);
    expect(isParticipantRoute("/journey")).toBe(false);
    expect(isParticipantRoute("/brand-preview")).toBe(false);
  });
});

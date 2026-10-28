import { describe, expect, it } from "vitest";
import { contactLinks } from "./project-contact";

describe("public project contacts", () => {
  it("does not invent missing contact channels", () => {
    expect(contactLinks({})).toEqual([]);
  });
  it("uses explicitly supplied contact channels", () => {
    expect(contactLinks({ contact_phone: "02 123 4567", contact_email: "team@example.org", contact_url: "https://example.org/contact" })).toEqual([
      { kind: "phone", label: "02 123 4567", href: "tel:021234567" },
      { kind: "email", label: "team@example.org", href: "mailto:team@example.org" },
      { kind: "url", label: "เปิดช่องทางติดต่อ", href: "https://example.org/contact" },
    ]);
  });
  it("never creates an executable contact URL", () => {
    expect(contactLinks({ contact_url: "javascript:alert(1)" })).toEqual([]);
  });
});
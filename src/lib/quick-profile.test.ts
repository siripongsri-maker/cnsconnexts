import { describe, expect, it } from "vitest";
import { quickStepHint, quickStepValid, toProfileInput, type QuickDraft } from "./quick-profile";
import type { ParticipantSession } from "./session";

const draft = (over: Partial<QuickDraft> = {}): QuickDraft => ({
  name: "มะลิ",
  region: "North",
  province: "Nan",
  interests: ["Youth"],
  powers_have: ["Ideas"],
  powers_need: [],
  ...over,
});

describe("quickStepValid", () => {
  it("step 1 needs a non-blank name and a region", () => {
    expect(quickStepValid(1, draft())).toBe(true);
    expect(quickStepValid(1, draft({ name: "" }))).toBe(false);
    expect(quickStepValid(1, draft({ name: "   " }))).toBe(false);
    expect(quickStepValid(1, draft({ name: " ก " }))).toBe(true);
    expect(quickStepValid(1, draft({ region: null }))).toBe(false);
  });

  it("step 1 needs a province unless Nationwide or Bangkok", () => {
    expect(quickStepValid(1, draft({ province: "" }))).toBe(false);
    expect(quickStepValid(1, draft({ province: "Nan" }))).toBe(true);
    expect(quickStepValid(1, draft({ region: "Nationwide", province: "" }))).toBe(true);
    expect(quickStepValid(1, draft({ region: "Bangkok", province: "" }))).toBe(true);
  });

  it("step 1 hint mentions the province", () => {
    expect(quickStepHint(1)).toBe("ใส่ชื่อ เลือกภาค และจังหวัดก่อนนะ");
  });

  it("step 2 needs at least one issue", () => {
    expect(quickStepValid(2, draft({ interests: [] }))).toBe(false);
    expect(quickStepValid(2, draft({ interests: ["Youth"] }))).toBe(true);
  });

  it("step 3 needs at least one power to give; powers_need is optional", () => {
    expect(quickStepValid(3, draft({ powers_have: [] }))).toBe(false);
    expect(quickStepValid(3, draft({ powers_have: ["Ideas"] }))).toBe(true);
    expect(quickStepValid(3, draft({ powers_have: ["Ideas"], powers_need: [] }))).toBe(true);
  });

  it("each step only looks at its own fields", () => {
    const blank = draft({ name: "", region: null, interests: [], powers_have: [] });
    expect(quickStepValid(2, { ...blank, interests: ["Youth"] })).toBe(true);
    expect(quickStepValid(3, { ...blank, powers_have: ["Ideas"] })).toBe(true);
  });
});

describe("toProfileInput", () => {
  const session = (source: ParticipantSession["source"]): ParticipantSession => ({
    id: "s-1",
    source,
    code: null,
    started_at: "2026-10-26T00:00:00Z",
  });

  it("fills the same defaults as the long ProfileForm and trims the name", () => {
    const out = toProfileInput(
      draft({ name: "  มะลิ  ", powers_need: ["Funding / Resources"] }),
      null,
    );
    expect(out).toEqual({
      name: "มะลิ",
      region: "North",
      province: "Nan",
      organization: "อิสระ",
      generation: "Millennial",
      bio: "",
      interests: ["Youth"],
      powers_have: ["Ideas"],
      powers_need: ["Funding / Resources"],
    });
    expect("source" in out).toBe(false);
  });

  it("writes the province: Bangkok fixed, Nationwide empty, otherwise the draft's", () => {
    expect(toProfileInput(draft({ region: "Bangkok", province: "" }), null).province).toBe(
      "Bangkok Metropolis",
    );
    expect(toProfileInput(draft({ region: "South", province: "Songkhla" }), null).province).toBe(
      "Songkhla",
    );
    expect(toProfileInput(draft({ region: "Nationwide", province: "Nan" }), null).province).toBe(
      "",
    );
  });

  it("sets source qr only when the session came from a QR code", () => {
    expect(toProfileInput(draft(), session("qr")).source).toBe("qr");
    expect("source" in toProfileInput(draft(), session("link"))).toBe(false);
    expect("source" in toProfileInput(draft(), session("direct"))).toBe(false);
  });

  it("does not share array references with the draft", () => {
    const d = draft();
    const out = toProfileInput(d, null);
    expect(out.interests).not.toBe(d.interests);
    expect(out.powers_have).not.toBe(d.powers_have);
  });

  it("refuses a draft without a region", () => {
    expect(() => toProfileInput(draft({ region: null }), null)).toThrow();
  });
});

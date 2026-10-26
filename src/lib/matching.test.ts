import { describe, expect, it } from "vitest";
import { regionLabel } from "./i18n";
import { buildDeck, dayKey, guestBlurb, rankForGuest, scoreMatch } from "./matching";
import type { Region, User } from "./types";

const LONG_NAME =
  "นางสาวกัญญารัตน์ ศรีสวัสดิ์วัฒนาพงษ์ มูลนิธิเครือข่ายสุขภาวะชุมชนภาคตะวันออกเฉียงเหนือ";

const mk = (id: string, over: Partial<User> = {}): User => ({
  id,
  name: `คน ${id}`,
  avatar: "",
  province: "เชียงใหม่",
  region: "North",
  organization: "กลุ่มทดสอบ",
  generation: "Millennial",
  bio: "",
  interests: ["Youth"],
  powers_have: ["Ideas"],
  powers_need: ["Funding / Resources"],
  created_at: "2026-10-01T00:00:00Z",
  ...over,
});

const tenComplete = Array.from({ length: 10 }, (_, i) => mk(`u${i}`));

describe("rankForGuest", () => {
  it("puts complete profiles before incomplete ones", () => {
    const pool = [
      mk("a", { interests: [] }),
      mk("b"),
      mk("c", { powers_have: [] }),
      mk("d"),
      mk("e", { organization: "" }),
      mk("f"),
    ];
    const ids = rankForGuest(pool, "2026-10-26").map((e) => e.user.id);
    const complete = new Set(["b", "d", "f"]);
    expect(ids.slice(0, 3).every((id) => complete.has(id))).toBe(true);
    expect(ids.slice(3).every((id) => !complete.has(id))).toBe(true);
    expect(ids).toHaveLength(6);
  });

  it("excludes users with an empty name", () => {
    const pool = [mk("a", { name: "" }), mk("b")];
    expect(rankForGuest(pool, "2026-10-26").map((e) => e.user.id)).toEqual(["b"]);
  });

  it("is stable for the same dayKey and differs across days", () => {
    const ids = (k: string) => rankForGuest(tenComplete, k).map((e) => e.user.id);
    expect(ids("2026-10-26")).toEqual(ids("2026-10-26"));
    expect(ids("2026-10-26")).not.toEqual(ids("2026-10-27"));
  });

  it("returns entries with a null match and respects the limit", () => {
    const deck = rankForGuest(tenComplete, "2026-10-26", 4);
    expect(deck).toHaveLength(4);
    expect(deck.every((e) => e.match === null)).toBe(true);
  });

  it("does not mutate the input pool", () => {
    const pool = [...tenComplete];
    rankForGuest(pool, "2026-10-26");
    expect(pool.map((u) => u.id)).toEqual(tenComplete.map((u) => u.id));
  });

  it("keeps a long Thai name and organisation unchanged", () => {
    const long = mk("long", { name: LONG_NAME, organization: LONG_NAME });
    const entry = rankForGuest([long], "2026-10-26")[0]!;
    expect(entry.user.name).toBe(LONG_NAME);
    expect(entry.user.organization).toBe(LONG_NAME);
  });
});

describe("buildDeck", () => {
  it("gives guests entries with match === null", () => {
    const deck = buildDeck(null, tenComplete, "2026-10-26");
    expect(deck).toHaveLength(10);
    expect(deck.every((e) => e.match === null)).toBe(true);
  });

  it("ranks by match for a participant and excludes themselves", () => {
    const me = tenComplete[0]!;
    const deck = buildDeck(me, tenComplete, "2026-10-26");
    expect(deck.map((e) => e.user.id)).not.toContain(me.id);
    expect(deck).toHaveLength(9);
    expect(deck.every((e) => e.match !== null && e.match.user === e.user)).toBe(true);
  });

  it("drops nameless people for a participant so the counter matches the cards", () => {
    const me = tenComplete[0]!;
    const pool = [...tenComplete, mk("blank", { name: "" }), mk("spaces", { name: "   " })];
    const ids = buildDeck(me, pool, "2026-10-26").map((e) => e.user.id);
    expect(ids).not.toContain("blank");
    expect(ids).not.toContain("spaces");
    expect(ids).toHaveLength(9);
  });

  it("drops nameless people for a guest", () => {
    const pool = [...tenComplete, mk("blank", { name: "" }), mk("spaces", { name: " \n " })];
    const ids = buildDeck(null, pool, "2026-10-26").map((e) => e.user.id);
    expect(ids).not.toContain("blank");
    expect(ids).not.toContain("spaces");
    expect(ids).toHaveLength(10);
  });

  it("does not let nameless people use up the participant deck's 30 slots", () => {
    const me = mk("me");
    // คนไม่มีชื่อได้คะแนนสูงกว่า (ตรงกับฉันทุกอย่าง) แต่ต้องไม่กินที่ของคนมีชื่อ
    const blanks = Array.from({ length: 30 }, (_, i) => mk(`blank${i}`, { name: "" }));
    const named = Array.from({ length: 5 }, (_, i) =>
      mk(`n${i}`, { interests: ["Policy"], powers_have: ["Knowledge"], region: "South" }),
    );
    expect(buildDeck(me, [...blanks, ...named], "2026-10-26")).toHaveLength(5);
  });
});

describe("guestBlurb", () => {
  it("joins the first issue and first power in Thai", () => {
    expect(guestBlurb(mk("a", { interests: ["Youth"], powers_have: ["Ideas"] }))).toBe(
      "ทำเรื่องเยาวชน · มีไอเดีย",
    );
  });

  it("works with only an issue or only a power", () => {
    expect(guestBlurb(mk("a", { interests: ["Youth"], powers_have: [] }))).toBe("ทำเรื่องเยาวชน");
    expect(guestBlurb(mk("a", { interests: [], powers_have: ["Ideas"] }))).toBe("มีไอเดีย");
  });

  it("is empty when there is neither", () => {
    expect(guestBlurb(mk("a", { interests: [], powers_have: [] }))).toBe("");
  });
});

describe("dayKey", () => {
  it("uses the Asia/Bangkok calendar day", () => {
    expect(dayKey(new Date("2026-10-28T20:00:00Z"))).toBe("2026-10-29");
    expect(dayKey(new Date("2026-10-28T16:59:59Z"))).toBe("2026-10-28");
  });
});

describe("regionLabel", () => {
  it("returns the Thai label for known regions and empty string otherwise", () => {
    expect(regionLabel("North")).toBe("ภาคเหนือ");
    expect(regionLabel("Bangkok")).toBe("กรุงเทพฯ");
    expect(regionLabel("Mars")).toBe("");
    expect(regionLabel("")).toBe("");
    expect(regionLabel("constructor")).toBe("");
    expect(regionLabel(null)).toBe("");
    expect(regionLabel(undefined)).toBe("");
  });
});

describe("scoreMatch with an unknown region", () => {
  // no shared issues, no shared powers → falls through to the region sentence
  const bare = {
    interests: ["Youth"],
    powers_have: ["Ideas"],
    powers_need: ["Funding / Resources"],
  };
  const me = (region: string) =>
    mk("me", {
      ...bare,
      interests: ["Health"],
      powers_have: ["Media"],
      powers_need: ["Legal"],
      region: region as Region,
    });
  const other = (region: string) => mk("o", { ...bare, region: region as Region });
  const FALLBACK = "ทำงานคนละแบบ ไอเดียใหม่มักเริ่มตรงนี้";

  it.each([
    ["Mars", "North"],
    ["", "North"],
    ["North", "Mars"],
    ["Mars", "Mars"],
    ["", ""],
  ])("never prints undefined (me=%j other=%j)", (a, b) => {
    const r = scoreMatch(me(a), other(b));
    expect(r.reason).not.toContain("undefined");
    expect(r.reason).toBe(FALLBACK);
    r.highlights.forEach((h) => expect(h).not.toContain("undefined"));
    expect(r.highlights.some((h) => h.includes("ภาค"))).toBe(false);
  });

  it("keeps the region sentence when both regions are known", () => {
    expect(scoreMatch(me("North"), other("North")).reason).toBe(
      "ทำงานคนละแบบ แต่ทำงานอยู่ภาคเหนือเหมือนกัน ไอเดียใหม่มักเริ่มตรงนี้",
    );
    expect(scoreMatch(me("North"), other("South")).reason).toBe(
      "ทำงานคนละแบบ แต่ได้เชื่อมภาคเหนือกับภาคใต้ ไอเดียใหม่มักเริ่มตรงนี้",
    );
    expect(scoreMatch(me("North"), other("South")).highlights).toContain("ข้ามภาค: ภาคใต้");
    expect(scoreMatch(me("North"), other("North")).highlights).toContain("ภาคเดียวกัน: ภาคเหนือ");
  });

  it("leaves the score untouched (pinned)", () => {
    expect(scoreMatch(me("Mars"), other("North")).score).toBe(45);
    expect(scoreMatch(me(""), other("North")).score).toBe(45);
    expect(scoreMatch(me("Mars"), other("Mars")).score).toBe(48);
    expect(scoreMatch(me("North"), other("North")).score).toBe(48);
    expect(scoreMatch(me("North"), other("South")).score).toBe(45);
    expect(scoreMatch(me("Nationwide"), other("South")).score).toBe(48);
  });

  it("also covers the shared-issue + power paths without undefined", () => {
    const r = scoreMatch(mk("me", { region: "Mars" as Region }), mk("o", { region: "" as Region }));
    expect(JSON.stringify(r)).not.toContain("undefined");
  });
});

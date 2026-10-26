import { describe, expect, it } from "vitest";
import { buildDeck, dayKey, guestBlurb, rankForGuest } from "./matching";
import type { User } from "./types";

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

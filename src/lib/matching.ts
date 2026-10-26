import type { User } from "./types";
import { issueTh, powerTh, regionLabel } from "./i18n";

const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x));

export type MatchResult = {
  user: User;
  score: number;
  reason: string;
  highlights: string[];
  theyBring: string[];
  theyNeed: string[];
  /** ความต้องการของเขาที่คุณมีให้ได้ */
  youCanGive: string[];
};

/**
 * Rule-based match score. Structured so an AI scorer can replace scoreMatch()
 * later without touching callers.
 * 40% their powers cover my needs · 30% shared issues · 20% complementary skills
 * 10% region / cross-region opportunity
 */
export function scoreMatch(me: User, other: User): MatchResult {
  const theyGiveMe = overlap(other.powers_have, me.powers_need);
  const iGiveThem = overlap(me.powers_have, other.powers_need);
  const sharedIssues = overlap(me.interests, other.interests);

  const supply = Math.min(theyGiveMe.length / 2, 1) * 40;
  const issues = Math.min(sharedIssues.length / 2, 1) * 30;
  const complement = Math.min(iGiveThem.length / 2, 1) * 20;
  const geo =
    me.region === other.region || me.region === "Nationwide" || other.region === "Nationwide"
      ? 10
      : 6;

  const score = Math.round(Math.min(96, 42 + (supply + issues + complement + geo) * 0.55));

  // เหตุผลสั้น ๆ อ่านเป็นประโยคเดียว (ไม่ต่อกันเป็นลิสต์ยาว)
  const parts: string[] = [];
  if (sharedIssues.length)
    parts.push(`คุณสองคนสนใจเรื่อง${sharedIssues.slice(0, 2).map(issueTh).join("และ")}เหมือนกัน`);
  if (theyGiveMe.length) parts.push(`เขามี “${powerTh(theyGiveMe[0]!)}” ที่คุณกำลังมองหา`);
  else if (iGiveThem.length) parts.push(`คุณมี “${powerTh(iGiveThem[0]!)}” ที่เขาต้องการพอดี`);
  // ถ้าภาคไม่รู้จัก (ข้อมูลเก่า/ไม่ถูกต้อง) ใช้ประโยคที่ไม่พูดถึงภาค
  const myRegion = regionLabel(me.region);
  const theirRegion = regionLabel(other.region);
  const regionsKnown = myRegion !== "" && theirRegion !== "";
  const geoBit =
    me.region === other.region
      ? `ทำงานอยู่${myRegion}เหมือนกัน`
      : `ได้เชื่อม${myRegion}กับ${theirRegion}`;
  const reason = parts.length
    ? parts.join(" แถม")
    : regionsKnown
      ? `ทำงานคนละแบบ แต่${geoBit} ไอเดียใหม่มักเริ่มตรงนี้`
      : "ทำงานคนละแบบ ไอเดียใหม่มักเริ่มตรงนี้";

  const highlights: string[] = [];
  if (sharedIssues.length) highlights.push(`ประเด็นร่วม: ${issueTh(sharedIssues[0]!)}`);
  if (theyGiveMe.length) highlights.push(`เติมให้คุณ: ${powerTh(theyGiveMe[0]!)}`);
  if (iGiveThem.length) highlights.push(`คุณช่วยเขา: ${powerTh(iGiveThem[0]!)}`);
  if (regionsKnown) {
    if (me.region === other.region) highlights.push(`ภาคเดียวกัน: ${myRegion}`);
    else highlights.push(`ข้ามภาค: ${theirRegion}`);
  }

  return {
    user: other,
    score,
    reason,
    highlights: highlights.slice(0, 3),
    theyBring: theyGiveMe.length ? theyGiveMe : other.powers_have.slice(0, 2),
    theyNeed: [...iGiveThem, ...other.powers_need.filter((p) => !iGiveThem.includes(p))].slice(0, 2),
    youCanGive: iGiveThem,
  };
}

export function rankMatches(me: User, pool: User[], limit = 12): MatchResult[] {
  return pool
    .filter((u) => u.id !== me.id)
    .map((u) => scoreMatch(me, u))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type DeckEntry = { user: User; match: MatchResult | null };

/** FNV-1a 32-bit string hash. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const isComplete = (u: User) =>
  u.interests.length > 0 && u.powers_have.length > 0 && u.organization.trim() !== "";

/**
 * Deck for visitors without a profile: complete profiles first, then a shuffle
 * that is fixed for a given dayKey (no Math.random) and changes day to day.
 */
export function rankForGuest(pool: User[], dayKey: string, limit = 30): DeckEntry[] {
  return pool
    .filter((u) => u.name.trim() !== "")
    .map((user) => ({ user, complete: isComplete(user), h: fnv1a(dayKey + user.id) }))
    .sort((a, b) => Number(b.complete) - Number(a.complete) || a.h - b.h)
    .slice(0, limit)
    .map(({ user }) => ({ user, match: null }));
}

export function buildDeck(me: User | null, pool: User[], dayKey: string): DeckEntry[] {
  return me
    ? rankMatches(me, pool, 30).map((m) => ({ user: m.user, match: m }))
    : rankForGuest(pool, dayKey);
}

/** One-line teaser for a card shown to a guest, e.g. "ทำเรื่องเยาวชน · มีไอเดีย". */
export function guestBlurb(u: User): string {
  const issue = u.interests[0];
  const power = u.powers_have[0];
  const parts: string[] = [];
  if (issue) parts.push(`ทำเรื่อง${issueTh(issue)}`);
  if (power) parts.push(`มี${powerTh(power)}`);
  return parts.join(" · ");
}

/** Calendar day (YYYY-MM-DD) in Asia/Bangkok, independent of the machine's timezone. */
export function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

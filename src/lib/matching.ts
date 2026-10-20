import type { User } from "./types";
import { issueTh, powerTh, REGION_LABEL } from "./i18n";

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
  const geoBit =
    me.region === other.region
      ? `ทำงานอยู่${REGION_LABEL[me.region]}เหมือนกัน`
      : `ได้เชื่อม${REGION_LABEL[me.region]}กับ${REGION_LABEL[other.region]}`;
  const reason = parts.length
    ? parts.join(" แถม")
    : `ทำงานคนละแบบ แต่${geoBit} ไอเดียใหม่มักเริ่มตรงนี้`;

  const highlights: string[] = [];
  if (sharedIssues.length) highlights.push(`ประเด็นร่วม: ${issueTh(sharedIssues[0]!)}`);
  if (theyGiveMe.length) highlights.push(`เติมให้คุณ: ${powerTh(theyGiveMe[0]!)}`);
  if (iGiveThem.length) highlights.push(`คุณช่วยเขา: ${powerTh(iGiveThem[0]!)}`);
  if (me.region === other.region) highlights.push(`ภาคเดียวกัน: ${REGION_LABEL[me.region]}`);
  else highlights.push(`ข้ามภาค: ${REGION_LABEL[other.region]}`);

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

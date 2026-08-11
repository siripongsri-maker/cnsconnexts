import type { User } from "./types";
import { issueTh, powerTh, REGION_LABEL } from "./i18n";

const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x));

export type MatchResult = {
  user: User;
  score: number;
  reason: string;
  theyBring: string[];
  theyNeed: string[];
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

  const bits: string[] = [];
  if (sharedIssues.length)
    bits.push(`สนใจเรื่อง${sharedIssues.slice(0, 2).map(issueTh).join("และ")}เหมือนกัน`);
  if (theyGiveMe.length) bits.push(`เขามี “${powerTh(theyGiveMe[0]!)}” ที่คุณกำลังมองหา`);
  if (iGiveThem.length) bits.push(`คุณมี “${powerTh(iGiveThem[0]!)}” ที่เขาต้องการพอดี`);
  if (!bits.length) bits.push("คุณสองคนทำงานคนละโลก — จุดเริ่มต้นของไอเดียใหม่มักอยู่ตรงนี้");

  const geoBit =
    me.region === other.region
      ? ` ทำงานอยู่${REGION_LABEL[me.region]}เหมือนกัน`
      : ` การเชื่อม ${REGION_LABEL[me.region]} × ${REGION_LABEL[other.region]} ไปได้ไกล`;

  const reason = bits.join(" · ") + geoBit;


  return {
    user: other,
    score,
    reason,
    theyBring: theyGiveMe.length ? theyGiveMe : other.powers_have.slice(0, 2),
    theyNeed: other.powers_need.slice(0, 2),
  };
}

export function rankMatches(me: User, pool: User[], limit = 12): MatchResult[] {
  return pool
    .filter((u) => u.id !== me.id)
    .map((u) => scoreMatch(me, u))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

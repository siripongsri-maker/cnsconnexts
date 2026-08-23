import type { User } from "./types";
import { issueTh, powerTh, REGION_LABEL } from "./i18n";
import { scoreMatch } from "./matching";
import type { DashboardFilters } from "./filter-presets";

export type SortKey = "relevance" | "match" | "name" | "region" | "recent";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "ตรงตัวกรองที่สุด" },
  { key: "match", label: "คะแนนแมตช์" },
  { key: "name", label: "ชื่อ ก–ฮ" },
  { key: "region", label: "ภูมิภาค" },
  { key: "recent", label: "เข้าร่วมล่าสุด" },
];

export type Scored = {
  user: User;
  /** 0–100 relevance to the current filters (blended with match score when signed in). */
  relevance: number;
  /** 0–100 personal match score, when a profile exists. */
  match: number | null;
  reasons: string[];
};

const contains = (hay: string, needle: string) => hay.toLowerCase().includes(needle);

/** How well a participant matches the active filters (0–100) + short Thai reasons. */
export function relevanceOf(u: User, f: DashboardFilters, me: User | null): Scored {
  const needle = f.q.trim().toLowerCase();
  const reasons: string[] = [];
  let points = 0;
  let weight = 0;

  if (needle) {
    weight += 45;
    const fields: [string, string][] = [
      [u.name, "ชื่อ"],
      [u.organization, "องค์กร"],
      [u.province, "จังหวัด"],
      [u.interests.map(issueTh).join(" "), "ประเด็น"],
      [[...u.powers_have, ...u.powers_need].map(powerTh).join(" "), "พลัง"],
      [u.bio, "แนะนำตัว"],
    ];
    const hit = fields.find(([v]) => contains(v, needle));
    if (hit) {
      const strong = hit[1] === "ชื่อ" || hit[1] === "องค์กร";
      points += strong ? 45 : 30;
      reasons.push(`ตรงคำค้นใน${hit[1]}`);
    }
  }

  if (f.region !== "all") {
    weight += 20;
    if (u.region === f.region) {
      points += 20;
      reasons.push(`อยู่${REGION_LABEL[u.region]}`);
    } else if (u.region === "Nationwide") {
      points += 12;
      reasons.push("ทำงานทั่วประเทศ");
    }
  }

  if (f.issue !== "all") {
    weight += 20;
    if (u.interests.includes(f.issue)) {
      points += 20;
      reasons.push(`สนใจ${issueTh(f.issue)}`);
    }
  }

  if (f.power !== "all") {
    weight += 15;
    const has = u.powers_have.includes(f.power);
    const needs = u.powers_need.includes(f.power);
    if (f.powerMode !== "need" && has) {
      points += 15;
      reasons.push(`มี${powerTh(f.power)}`);
    } else if (f.powerMode !== "have" && needs) {
      points += 12;
      reasons.push(`ต้องการ${powerTh(f.power)}`);
    }
  }

  const filterScore = weight ? Math.round((points / weight) * 100) : 0;
  const match = me && me.id !== u.id ? scoreMatch(me, u).score : null;

  const relevance = weight
    ? match != null
      ? Math.round(filterScore * 0.7 + match * 0.3)
      : filterScore
    : (match ?? 50);

  if (!reasons.length && match != null) reasons.push(`แมตช์กับคุณ ${match}%`);

  return { user: u, relevance: Math.min(100, relevance), match, reasons: reasons.slice(0, 3) };
}

export function sortScored(list: Scored[], sort: SortKey): Scored[] {
  const arr = [...list];
  switch (sort) {
    case "match":
      return arr.sort((a, b) => (b.match ?? -1) - (a.match ?? -1) || b.relevance - a.relevance);
    case "name":
      return arr.sort((a, b) => a.user.name.localeCompare(b.user.name, "th"));
    case "region":
      return arr.sort(
        (a, b) =>
          REGION_LABEL[a.user.region].localeCompare(REGION_LABEL[b.user.region], "th") ||
          b.relevance - a.relevance,
      );
    case "recent":
      return arr.sort(
        (a, b) =>
          +new Date(b.user.updated_at ?? b.user.created_at) -
          +new Date(a.user.updated_at ?? a.user.created_at),
      );
    default:
      return arr.sort((a, b) => b.relevance - a.relevance || (b.match ?? 0) - (a.match ?? 0));
  }
}

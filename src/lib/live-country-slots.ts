import type { LiveMapEdge } from "./live-map-layout";

export const COUNTRY_SLOTS = 4;

/** Newest pair first (createdAt desc), ties broken by id asc. */
export function orderCountryPairs(edges: readonly LiveMapEdge[]): LiveMapEdge[] {
  return [...edges].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Up to COUNTRY_SLOTS edge ids for the given 0-based round, rotating through all pairs. */
export function countrySlotPlan(edges: readonly LiveMapEdge[], round: number): string[] {
  const ordered = orderCountryPairs(edges);
  const n = ordered.length;
  if (n === 0) return [];
  const count = Math.min(COUNTRY_SLOTS, n);
  const start = (((round * COUNTRY_SLOTS) % n) + n) % n;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) ids.push(ordered[(start + i) % n]!.id);
  return ids;
}

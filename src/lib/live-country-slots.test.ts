import { describe, expect, it } from "vitest";
import type { LiveMapEdge } from "./live-map-layout";
import { COUNTRY_SLOTS, countrySlotPlan, orderCountryPairs } from "./live-country-slots";

function makeEdges(n: number): LiveMapEdge[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i + 1}`,
    sourceId: `a${i + 1}`,
    targetId: `b${i + 1}`,
    path: "",
    sharedInterests: [],
    createdAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
  })) as unknown as LiveMapEdge[];
}

describe("live-country-slots", () => {
  it("empty edges give an empty plan", () => {
    expect(countrySlotPlan([], 0)).toEqual([]);
    expect(countrySlotPlan([], 3)).toEqual([]);
  });

  it("fewer than 4 pairs returns all of them without duplicates", () => {
    const ids = countrySlotPlan(makeEdges(3), 5);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it("returns at most 4 ids per round", () => {
    const edges = makeEdges(10);
    for (let r = 0; r < 8; r++) {
      const ids = countrySlotPlan(edges, r);
      expect(ids.length).toBeLessThanOrEqual(COUNTRY_SLOTS);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("rotation covers every pair", () => {
    const edges = makeEdges(10);
    const seen = new Set<string>();
    for (let r = 0; r <= 4; r++) countrySlotPlan(edges, r).forEach((id) => seen.add(id));
    expect(seen).toEqual(new Set(edges.map((e) => e.id)));
  });

  it("newest first in round 0", () => {
    const edges = makeEdges(10);
    expect(countrySlotPlan(edges, 0)[0]).toBe("e10");
    expect(orderCountryPairs(edges)[0]!.id).toBe("e10");
  });

  it("breaks createdAt ties by id ascending", () => {
    const edges = makeEdges(3).map((e) => ({ ...e, createdAt: "2026-01-01T00:00:00.000Z" }));
    expect(orderCountryPairs([edges[2]!, edges[0]!, edges[1]!]).map((e) => e.id)).toEqual([
      "e1",
      "e2",
      "e3",
    ]);
  });
});

import type { LiveMapEdge, LiveMapLayout, TourGroupKey } from "./live-map-layout";

export const TOUR_ORDER: TourGroupKey[] = ["north", "northeast", "central", "south"];

export const TOUR_LIMITS = { intraPerRegion: 6, crossPerRegion: 2 };

export const GROUP_LABEL: Record<TourGroupKey, string> = {
  north: "ภาคเหนือ",
  northeast: "ภาคอีสาน",
  central: "ภาคกลางและกรุงเทพฯ",
  south: "ภาคใต้",
};

export type TourStep =
  | {
      kind: "region";
      group: TourGroupKey;
      nodeIds: string[];
      edgeIds: string[];
      intraCount: number;
      crossCount: number;
    }
  | { kind: "cross"; group: TourGroupKey; edgeId: string; fromId: string; toId: string }
  | { kind: "overview"; edgeIds: string[] };

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Newest first by `createdAt`, then edge id ascending. */
const newestFirst = (a: LiveMapEdge, b: LiveMapEdge) =>
  compare(b.createdAt, a.createdAt) || compare(a.id, b.id);

/**
 * Up to `size` ids for the given 0-based round, rotating through all of `ids`
 * (same modular idea as `countrySlotPlan`): round 0 is the first `size`, each
 * later round starts `size` further on, wrapping, so every id gets a turn.
 */
export function rotatingWindow(ids: readonly string[], size: number, round: number): string[] {
  const n = ids.length;
  if (n === 0) return [];
  const count = Math.min(size, n);
  const start = (((round * size) % n) + n) % n;
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(ids[(start + i) % n]!);
  return out;
}

/**
 * Turn a layout into the ordered steps of the region tour: per region, a region
 * step (up to six in-region pairs) then up to two cross flights that start in
 * it, and finally an overview of every pair.
 *
 * `round` (default 0 = the newest six) rotates each region step's window
 * through ALL its in-region pairs; the one-region view passes its loop count
 * so older pairs in a busy region get their turn.
 */
export function buildTour(layout: LiveMapLayout, round = 0): TourStep[] {
  if (layout.edges.length === 0) return [];

  const intra = new Map<TourGroupKey, LiveMapEdge[]>();
  const cross: { edge: LiveMapEdge; home: TourGroupKey; fromId: string; toId: string }[] = [];

  for (const edge of [...layout.edges].sort(newestFirst)) {
    const source = layout.nodesById.get(edge.sourceId);
    const target = layout.nodesById.get(edge.targetId);
    if (!source || !target) continue;
    if (source.group === null && target.group === null) continue;
    if (source.group === target.group) {
      const list = intra.get(source.group!) ?? [];
      list.push(edge);
      intra.set(source.group!, list);
      continue;
    }
    const sourceHome = source.group !== null;
    cross.push({
      edge,
      home: (sourceHome ? source.group : target.group)!,
      fromId: sourceHome ? source.id : target.id,
      toId: sourceHome ? target.id : source.id,
    });
  }

  const steps: TourStep[] = [];
  for (const group of TOUR_ORDER) {
    const inRegion = intra.get(group) ?? [];
    const touching = cross.filter(({ edge }) => {
      const s = layout.nodesById.get(edge.sourceId);
      const t = layout.nodesById.get(edge.targetId);
      return s?.group === group || t?.group === group;
    });
    if (inRegion.length === 0 && touching.length === 0) continue;

    steps.push({
      kind: "region",
      group,
      nodeIds: layout.nodes.filter((n) => n.group === group).map((n) => n.id),
      edgeIds: rotatingWindow(
        inRegion.map((e) => e.id),
        TOUR_LIMITS.intraPerRegion,
        round,
      ),
      intraCount: inRegion.length,
      crossCount: touching.length,
    });
    for (const flight of cross
      .filter((c) => c.home === group)
      .slice(0, TOUR_LIMITS.crossPerRegion)) {
      steps.push({
        kind: "cross",
        group,
        edgeId: flight.edge.id,
        fromId: flight.fromId,
        toId: flight.toId,
      });
    }
  }

  steps.push({
    kind: "overview",
    edgeIds: [...layout.edges].sort(newestFirst).map((e) => e.id),
  });
  return steps;
}

/**
 * The steps of a one-region view: that region's step and the cross flights
 * whose home is that region, in tour order. Overview steps are dropped.
 */
export function regionViewSteps(steps: readonly TourStep[], group: TourGroupKey): TourStep[] {
  return steps.filter((step) => step.kind !== "overview" && step.group === group);
}

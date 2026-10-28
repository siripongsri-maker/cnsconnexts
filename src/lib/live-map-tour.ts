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

/** A pair whose two people sit in different tour groups (at most one may be a hub). */
type CrossPair = {
  edge: LiveMapEdge;
  sourceId: string;
  targetId: string;
  sourceGroup: TourGroupKey | null;
  targetGroup: TourGroupKey | null;
};

/** Split a layout's pairs, newest first, into in-region lists and cross pairs. */
function splitPairs(layout: LiveMapLayout) {
  const intra = new Map<TourGroupKey, LiveMapEdge[]>();
  const cross: CrossPair[] = [];
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
    cross.push({
      edge,
      sourceId: source.id,
      targetId: target.id,
      sourceGroup: source.group,
      targetGroup: target.group,
    });
  }
  return { intra, cross };
}

const touches = (pair: CrossPair, group: TourGroupKey) =>
  pair.sourceGroup === group || pair.targetGroup === group;

/** A cross step for `pair` that starts on `group`'s side and flies to the other end. */
function flightFrom(pair: CrossPair, group: TourGroupKey): TourStep {
  const fromSource = pair.sourceGroup === group;
  return {
    kind: "cross",
    group,
    edgeId: pair.edge.id,
    fromId: fromSource ? pair.sourceId : pair.targetId,
    toId: fromSource ? pair.targetId : pair.sourceId,
  };
}

/**
 * Turn a layout into the ordered steps of the region tour: per region, a region
 * step (up to six in-region pairs) then up to two cross flights that start in
 * it, and finally an overview of every pair. In the tour each cross pair flies
 * once, from its home: the source person's group, or the target's when the
 * source is a hub.
 *
 * `round` (default 0 = the newest six) rotates each region step's window
 * through ALL its in-region pairs; the one-region view passes its loop count
 * so older pairs in a busy region get their turn.
 */
export function buildTour(layout: LiveMapLayout, round = 0): TourStep[] {
  if (layout.edges.length === 0) return [];

  const { intra, cross } = splitPairs(layout);
  const homeOf = (pair: CrossPair) => (pair.sourceGroup ?? pair.targetGroup)!;

  const steps: TourStep[] = [];
  for (const group of TOUR_ORDER) {
    const inRegion = intra.get(group) ?? [];
    const touching = cross.filter((pair) => touches(pair, group));
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
    for (const pair of cross
      .filter((c) => homeOf(c) === group)
      .slice(0, TOUR_LIMITS.crossPerRegion)) {
      steps.push(flightFrom(pair, group));
    }
  }

  steps.push({
    kind: "overview",
    edgeIds: [...layout.edges].sort(newestFirst).map((e) => e.id),
  });
  return steps;
}

/**
 * The steps of a one-region view: that region's step from `steps`, then up to
 * two cross flights (newest first) for pairs in `layout` that TOUCH the region,
 * whichever side registered them, each flying out from the region's side.
 * Overview steps are dropped. `layout` must be the one `steps` was built from.
 */
export function regionViewSteps(
  steps: readonly TourStep[],
  group: TourGroupKey,
  layout: LiveMapLayout,
): TourStep[] {
  const region = steps.filter((step) => step.kind === "region" && step.group === group);
  if (region.length === 0) return [];
  const flights = splitPairs(layout)
    .cross.filter((pair) => touches(pair, group))
    .slice(0, TOUR_LIMITS.crossPerRegion)
    .map((pair) => flightFrom(pair, group));
  return [...region, ...flights];
}

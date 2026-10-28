import { REGION_LABEL } from "./i18n";
import {
  buildPeopleNetwork,
  pairPath,
  provinceAt,
  type NetworkConnection,
  type NetworkPerson,
  type PeopleNetworkNode,
} from "./people-network";
import { PROVINCES, type ProvinceShape } from "./thailand-geo";
import type { Region } from "./types";

/** Tour slides. Bangkok is part of "central". */
export type TourGroupKey = "north" | "northeast" | "central" | "south";

/**
 * Where people with no region at all are shown: open water in the Gulf of
 * Thailand, so it never reads as a place on land (viewBox 1000×1600).
 */
export const HUB_POINT = { x: 385, y: 900 } as const;

/** `[minX, minY, maxX, maxY]` in map (viewBox) units. */
type Box = [number, number, number, number];

export type LiveMapNode = {
  id: string;
  name: string;
  /** Diagram position within the stated province or region, never an address. */
  x: number;
  y: number;
  /** Tour slide this person belongs to; null for the nationwide hub. */
  group: TourGroupKey | null;
  /** Thai place text: the province, `ไม่ระบุจังหวัด · <ภาค>`, or `ทั่วประเทศ`. */
  placeLabel: string;
  /** Area to frame for this person: the province outline box, or ±30 around the dot. */
  box: Box;
  /** `province`: inside the province. `region`: inside the region. `hub`: sea point. */
  kind: "province" | "region" | "hub";
};

export type LiveMapEdge = {
  id: string;
  /** Ordered by id, as in `buildPeopleNetwork`. */
  sourceId: string;
  targetId: string;
  /** SVG quadratic path between the two nodes. */
  path: string;
  /** Exact intersection of both profiles' interests, never a match reason. */
  sharedInterests: string[];
  /** Newest recorded connection time for the pair, or "" when undated. */
  createdAt: string;
};

export type LiveMapLayout = {
  /** Exactly the people on at least one pair, sorted by id. */
  nodes: LiveMapNode[];
  nodesById: Map<string, LiveMapNode>;
  edges: LiveMapEdge[];
};

type Point = { x: number; y: number };

const GROUP_BY_REGION = {
  North: "north",
  Northeast: "northeast",
  Central: "central",
  Bangkok: "central",
  South: "south",
} as const satisfies Partial<Record<Region, TourGroupKey>>;
type GroupedRegion = keyof typeof GROUP_BY_REGION;

const GOLDEN_ANGLE = 2.399963;
// Region-only people are placed along a spiral from the region centre: candidate
// k sits at radius WALK_START + WALK_STEP * sqrt(k), angle k * GOLDEN_ANGLE.
const WALK_START = 3;
const WALK_STEP = 1.5;
const WALK_CAP = 4000;
/** Region-only dots keep at least this far apart while the region has room. */
const MIN_DOT_GAP = 8;
const POINT_BOX_HALF = 30;

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Stored profile values can be outside the `Region` union, so check at runtime. */
function groupedRegion(value: string | null | undefined): GroupedRegion | null {
  return value != null && Object.hasOwn(GROUP_BY_REGION, value) ? (value as GroupedRegion) : null;
}

function groupOf(region: Region): TourGroupKey | null {
  const key = groupedRegion(region);
  return key ? GROUP_BY_REGION[key] : null;
}

// Province geometry holds only M/L/Z commands, each with one x y pair, so the
// numbers in a path alternate x, y.
function outlineBox(d: string): Box {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const box: Box = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i]!;
    const y = numbers[i + 1]!;
    box[0] = Math.min(box[0], x);
    box[1] = Math.min(box[1], y);
    box[2] = Math.max(box[2], x);
    box[3] = Math.max(box[3], y);
  }
  return box;
}

const outlineBoxes = new Map<string, Box>();

function provinceBox(province: ProvinceShape): Box {
  let box = outlineBoxes.get(province.en);
  if (!box) {
    box = outlineBox(province.d);
    outlineBoxes.set(province.en, box);
  }
  return [...box];
}

function pointBox(point: Point): Box {
  return [
    point.x - POINT_BOX_HALF,
    point.y - POINT_BOX_HALF,
    point.x + POINT_BOX_HALF,
    point.y + POINT_BOX_HALF,
  ];
}

const groupBoxes = new Map<TourGroupKey, Box>();
for (const province of PROVINCES) {
  const group = groupOf(province.region);
  if (!group) continue;
  const box = provinceBox(province);
  const union = groupBoxes.get(group) ?? box;
  groupBoxes.set(group, [
    Math.min(union[0], box[0]),
    Math.min(union[1], box[1]),
    Math.max(union[2], box[2]),
    Math.max(union[3], box[3]),
  ]);
}

/** The union of the province boxes in a tour group. */
export function groupBox(group: TourGroupKey): Box {
  const box = groupBoxes.get(group);
  // Every group has provinces; the whole map (viewBox 1000×1600) is the safe frame otherwise.
  return box ? [...box] : [0, 0, 1000, 1600];
}

// A region's centre is the mean of its provinces' centres, so it can fall outside
// an oddly shaped region; the walk below only keeps candidates that are inside.
const regionCentres = new Map<GroupedRegion, Point>();
for (const region of Object.keys(GROUP_BY_REGION) as GroupedRegion[]) {
  const members = PROVINCES.filter((province) => province.region === region);
  if (members.length === 0) continue;
  regionCentres.set(region, {
    x: members.reduce((sum, province) => sum + province.cx, 0) / members.length,
    y: members.reduce((sum, province) => sum + province.cy, 0) / members.length,
  });
}

function provinceNode(node: PeopleNetworkNode): LiveMapNode {
  return {
    id: node.id,
    name: node.user.name,
    x: node.x,
    y: node.y,
    group: groupOf(node.province.region),
    placeLabel: node.province.th,
    box: provinceBox(node.province),
    kind: "province",
  };
}

const regionWalks = new Map<GroupedRegion, Point[]>();

/**
 * The spiral candidates around a region's centre that fall inside one of the
 * region's own provinces, in walk order. Depends only on the region, so it is
 * computed once and gives the same answer whoever is placed.
 */
function regionWalk(region: GroupedRegion, centre: Point): Point[] {
  const cached = regionWalks.get(region);
  if (cached) return cached;
  const walk: Point[] = [];
  for (let k = 0; k < WALK_CAP; k++) {
    const radius = WALK_START + WALK_STEP * Math.sqrt(k);
    const angle = k * GOLDEN_ANGLE;
    const point = {
      x: centre.x + Math.cos(angle) * radius,
      y: centre.y + Math.sin(angle) * radius,
    };
    if (provinceAt(point)?.region === region) walk.push(point);
  }
  regionWalks.set(region, walk);
  return walk;
}

/**
 * The first spiral point inside the region that is at least MIN_DOT_GAP from the
 * dots already placed. When the region is too crowded for that, the inside point
 * with the most clearance from them (the earliest one on a tie), so a dot never
 * leaves the region and the spots only repeat once every candidate is taken.
 */
function placeInRegion(region: GroupedRegion, centre: Point, placed: readonly Point[]): Point {
  const clearance = (point: Point) =>
    placed.reduce(
      (least, dot) => Math.min(least, Math.hypot(point.x - dot.x, point.y - dot.y)),
      Infinity,
    );
  let best: Point | undefined;
  let bestClearance = -1;
  for (const point of regionWalk(region, centre)) {
    const gap = clearance(point);
    if (gap >= MIN_DOT_GAP) return point;
    if (gap > bestClearance) {
      best = point;
      bestClearance = gap;
    }
  }
  return best ?? centre;
}

/**
 * A person without a usable province: a spot inside their region (`placed` holds
 * the dots already put in each region), or the shared hub when the region is
 * missing or unknown too.
 */
function unplacedNode(user: NetworkPerson, placed: Map<GroupedRegion, Point[]>): LiveMapNode {
  const region = groupedRegion(user.region);
  const centre = region ? regionCentres.get(region) : undefined;
  if (!region || !centre) {
    const hub = { x: HUB_POINT.x, y: HUB_POINT.y };
    return {
      id: user.id,
      name: user.name,
      ...hub,
      group: null,
      placeLabel: REGION_LABEL.Nationwide,
      box: pointBox(hub),
      kind: "hub",
    };
  }
  let dots = placed.get(region);
  if (!dots) {
    dots = [];
    placed.set(region, dots);
  }
  const point = placeInRegion(region, centre, dots);
  dots.push(point);
  return {
    id: user.id,
    name: user.name,
    x: point.x,
    y: point.y,
    group: GROUP_BY_REGION[region],
    placeLabel: `ไม่ระบุจังหวัด · ${REGION_LABEL[region]}`,
    box: pointBox(point),
    kind: "region",
  };
}

/** How far above a shared point the loop for a same-spot pair reaches (viewBox units). */
const LOOP_HEIGHT = 28;

/**
 * A small teardrop loop above `point`, for a pair whose two people share one
 * spot (e.g. both at the hub), so the pair is still visible as a line.
 */
function loopPath(point: Point): string {
  const value = (n: number) => n.toFixed(2);
  // A cubic with both controls at 4/3 the height peaks at exactly LOOP_HEIGHT.
  const top = point.y - (LOOP_HEIGHT * 4) / 3;
  return `M ${value(point.x)} ${value(point.y)} C ${value(point.x - 22)} ${value(top)} ${value(point.x + 22)} ${value(top)} ${value(point.x)} ${value(point.y)}`;
}

/**
 * Give every person on a recorded pair a map position, and every pair a path.
 * Province known: inside the province. Region only: inside that region, spread
 * out from its centre in join order (created_at, then id). Neither: the hub in the sea. Pairs, dedupe and the demo-profile filter come
 * from `buildPeopleNetwork`; people with no pair are left out.
 */
export function buildLiveMapLayout(
  users: readonly NetworkPerson[],
  connections: readonly NetworkConnection[],
): LiveMapLayout {
  const network = buildPeopleNetwork(users, connections);
  const provinceNodes = new Map(network.nodes.map((node) => [node.id, node]));

  const connected = new Map<string, NetworkPerson>();
  for (const edge of network.edges) {
    connected.set(edge.source.id, edge.source);
    connected.set(edge.target.id, edge.target);
  }
  // Placing in join order (created_at, then id) makes each region's ring
  // independent of input order, and a newcomer appends instead of shifting it.
  const placed = new Map<GroupedRegion, Point[]>();
  const nodes = [...connected.values()]
    .sort((a, b) => compare(a.created_at ?? "", b.created_at ?? "") || compare(a.id, b.id))
    .map((user) => {
      const located = provinceNodes.get(user.id);
      return located ? provinceNode(located) : unplacedNode(user, placed);
    });
  nodes.sort((a, b) => compare(a.id, b.id));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const edges = network.edges.flatMap((edge): LiveMapEdge[] => {
    const source = nodesById.get(edge.source.id);
    const target = nodesById.get(edge.target.id);
    if (!source || !target) return [];
    return [
      {
        id: edge.id,
        sourceId: source.id,
        targetId: target.id,
        path:
          source.x === target.x && source.y === target.y
            ? loopPath(source)
            : pairPath(source, target, edge.id),
        sharedInterests: edge.sharedInterests,
        createdAt: edge.connections[0]?.created_at ?? "",
      },
    ];
  });

  return { nodes, nodesById, edges };
}

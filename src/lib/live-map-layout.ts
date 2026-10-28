import { REGION_LABEL } from "./i18n";
import {
  buildPeopleNetwork,
  pairPath,
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
  /** `province`: inside the province. `region`: ring around the region. `hub`: sea point. */
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

const RING_BASE_RADIUS = 24;
const RING_STEP = 9;
const GOLDEN_ANGLE = 2.399963;
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

// A region's centre is the mean of its provinces' centres.
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

/**
 * A person without a usable province: a golden-angle spiral around the centre of
 * their region (`ringIndex` counts the people already placed there), or the
 * shared hub when the region is missing or unknown too.
 */
function unplacedNode(user: NetworkPerson, ringIndex: Map<GroupedRegion, number>): LiveMapNode {
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
  const i = ringIndex.get(region) ?? 0;
  ringIndex.set(region, i + 1);
  const radius = RING_BASE_RADIUS + RING_STEP * Math.sqrt(i);
  const angle = i * GOLDEN_ANGLE;
  const point = {
    x: centre.x + Math.cos(angle) * radius,
    y: centre.y + Math.sin(angle) * radius,
  };
  return {
    id: user.id,
    name: user.name,
    ...point,
    group: GROUP_BY_REGION[region],
    placeLabel: `ไม่ระบุจังหวัด · ${REGION_LABEL[region]}`,
    box: pointBox(point),
    kind: "region",
  };
}

/**
 * Give every person on a recorded pair a map position, and every pair a path.
 * Province known: inside the province. Region only: a ring around the region.
 * Neither: the hub in the sea. Pairs, dedupe and the demo-profile filter come
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
  // Sorting by id first makes each region's ring order independent of input order.
  const ringIndex = new Map<GroupedRegion, number>();
  const nodes = [...connected.values()]
    .sort((a, b) => compare(a.id, b.id))
    .map((user) => {
      const located = provinceNodes.get(user.id);
      return located ? provinceNode(located) : unplacedNode(user, ringIndex);
    });
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
        path: pairPath(source, target, edge.id),
        sharedInterests: edge.sharedInterests,
        createdAt: edge.connections[0]?.created_at ?? "",
      },
    ];
  });

  return { nodes, nodesById, edges };
}

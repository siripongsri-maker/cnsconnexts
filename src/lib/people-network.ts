import { PROVINCES, type ProvinceShape } from "./thailand-geo";
import type { Connection, User } from "./types";

export type PeopleNetworkNode = {
  id: string;
  user: User;
  province: ProvinceShape;
  /** Diagram positions within the stated province, never a person's address. */
  x: number;
  y: number;
  degree: number;
};

export type PeopleNetworkEdge = {
  /** Stable unordered pair key; a pair is drawn only once. */
  id: string;
  source: User;
  target: User;
  /** Original records, newest first, without conflating their statuses. */
  connections: Connection[];
  sharedInterests: string[];
  sourceNode: PeopleNetworkNode | null;
  targetNode: PeopleNetworkNode | null;
  /** SVG quadratic path, available only when both provinces are known. */
  path: string | null;
};

export type PeopleNetwork = {
  people: User[];
  nodes: PeopleNetworkNode[];
  edges: PeopleNetworkEdge[];
  plottedEdges: PeopleNetworkEdge[];
  unlocatedEdges: PeopleNetworkEdge[];
  stats: {
    people: number;
    locatedPeople: number;
    connectedPeople: number;
    connections: number;
    plottedConnections: number;
    unlocatedConnections: number;
    unresolvedRecords: number;
    pendingRecords: number;
    selfRecords: number;
    duplicateRecords: number;
  };
};

const provincesByName = new Map(
  PROVINCES.flatMap((p) => [
    [p.en, p],
    [p.th, p],
  ]),
);
const bangkok = provincesByName.get("Bangkok Metropolis");
if (bangkok) {
  for (const alias of ["Bangkok", "กรุงเทพฯ", "กรุงเทพ"]) provincesByName.set(alias, bangkok);
}
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) {
    result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  }
  return result >>> 0;
}

type Point = { x: number; y: number };

// Province geometry contains only SVG M/L/Z polygons. Keeping the placement test
// independent of the DOM makes the same diagram render on server and client.
const provinceRings = new Map(
  PROVINCES.map((province) => [
    province.en,
    [...province.d.matchAll(/M([^M]*)/g)].map((ring) => {
      const numbers = (ring[1]?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      const points: Point[] = [];
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        points.push({ x: numbers[i]!, y: numbers[i + 1]! });
      }
      return points;
    }),
  ]),
);

function inRing(point: Point, ring: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function provincePosition(province: ProvinceShape, id: string, count: number): Point {
  const rings = provinceRings.get(province.en) ?? [];
  const seed = hash(id);
  const phase = (seed / 4294967296) * Math.PI * 2;
  const spread = Math.min(46, 10 + Math.sqrt(count) * 7);
  // The candidates stay near the province centre and inside its actual outline.
  // A stable ID phase separates same-province people without inventing locations.
  for (let i = 0; i < 180; i++) {
    const radius = spread * Math.sqrt((((i * 37 + (seed % 179)) % 180) + 0.5) / 180);
    const angle = phase + i * 2.399963229728653;
    const point = {
      x: province.cx + Math.cos(angle) * radius,
      y: province.cy + Math.sin(angle) * radius,
    };
    if (rings.some((ring) => inRing(point, ring))) return point;
  }
  // An outline vertex is still a truthful province anchor for very small islands.
  return rings[0]?.[0] ?? { x: province.cx, y: province.cy };
}

function edgePath(source: PeopleNetworkNode, target: PeopleNetworkNode, id: string): string {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  const direction = hash(id) % 2 === 0 ? 1 : -1;
  const bend = Math.max(16, Math.min(180, distance * 0.24)) * direction;
  const scale = distance || 1;
  const controlX = (source.x + target.x) / 2 - (dy / scale) * bend;
  const controlY = (source.y + target.y) / 2 + (dx / scale) * bend;
  const value = (n: number) => n.toFixed(2);
  return `M ${value(source.x)} ${value(source.y)} Q ${value(controlX)} ${value(controlY)} ${value(target.x)} ${value(target.y)}`;
}

/**
 * Project only recorded relationships. Shared interests are the exact
 * intersection of both profiles, never a match score or generated match reason.
 * Seed/demo profiles are excluded from people and relationship endpoints.
 * The caller must pass only records it is authorized to display.
 */
export function buildPeopleNetwork(
  users: readonly User[],
  connections: readonly Connection[],
  me: User | null = null,
): PeopleNetwork {
  const byId = new Map<string, User>();
  for (const user of users) {
    if (user.source === "demo") continue;
    const existing = byId.get(user.id);
    const revision = (profile: User) =>
      JSON.stringify([
        profile.updated_at || profile.created_at,
        profile.name,
        profile.province,
        [...profile.interests].sort(compare),
      ]);
    if (user.id && (!existing || compare(revision(user), revision(existing)) > 0)) {
      byId.set(user.id, user);
    }
  }
  if (me?.id) {
    if (me.source === "demo") byId.delete(me.id);
    else byId.set(me.id, me);
    if (me.id !== "me") byId.delete("me");
  }
  const resolve = (id: string) => byId.get(id === "me" && me ? me.id : id);
  const people = [...byId.values()].sort((a, b) => compare(a.id, b.id));
  const pairs = new Map<string, { source: User; target: User; connections: Connection[] }>();
  const degree = new Map<string, number>();
  let unresolvedRecords = 0;
  let pendingRecords = 0;
  let selfRecords = 0;
  let duplicateRecords = 0;

  for (const connection of connections) {
    if (connection.pending) {
      pendingRecords++;
      continue;
    }
    const a = resolve(connection.user_a);
    const b = resolve(connection.user_b);
    if (!a || !b) {
      unresolvedRecords++;
      continue;
    }
    if (a.id === b.id) {
      selfRecords++;
      continue;
    }
    const [source, target] = compare(a.id, b.id) < 0 ? [a, b] : [b, a];
    const id = JSON.stringify([source.id, target.id]);
    const existing = pairs.get(id);
    if (existing) {
      existing.connections.push(connection);
      duplicateRecords++;
    } else {
      pairs.set(id, { source, target, connections: [connection] });
      degree.set(source.id, (degree.get(source.id) ?? 0) + 1);
      degree.set(target.id, (degree.get(target.id) ?? 0) + 1);
    }
  }

  const locationById = new Map(
    people.map((user) => [user.id, provincesByName.get(user.province.trim())]),
  );
  const provinceCounts = new Map<string, number>();
  for (const province of locationById.values()) {
    if (province) provinceCounts.set(province.en, (provinceCounts.get(province.en) ?? 0) + 1);
  }
  const nodes: PeopleNetworkNode[] = [];
  for (const user of people) {
    const province = locationById.get(user.id);
    if (!province) continue;
    const position = provincePosition(province, user.id, provinceCounts.get(province.en) ?? 1);
    nodes.push({ id: user.id, user, province, ...position, degree: degree.get(user.id) ?? 0 });
  }
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges: PeopleNetworkEdge[] = [...pairs.entries()]
    .sort(([a], [b]) => compare(a, b))
    .map(([id, pair]) => {
      const sourceNode = nodesById.get(pair.source.id) ?? null;
      const targetNode = nodesById.get(pair.target.id) ?? null;
      const targetInterests = new Set(pair.target.interests);
      const sharedInterests = [...new Set(pair.source.interests)]
        .filter((interest) => !!interest.trim() && targetInterests.has(interest))
        .sort(compare);
      return {
        id,
        ...pair,
        connections: [...pair.connections].sort(
          (a, b) => compare(b.created_at, a.created_at) || compare(a.id, b.id),
        ),
        sharedInterests,
        sourceNode,
        targetNode,
        path: sourceNode && targetNode ? edgePath(sourceNode, targetNode, id) : null,
      };
    });
  const plottedEdges = edges.filter((edge) => edge.path !== null);
  const unlocatedEdges = edges.filter((edge) => edge.path === null);
  return {
    people,
    nodes,
    edges,
    plottedEdges,
    unlocatedEdges,
    stats: {
      people: people.length,
      locatedPeople: nodes.length,
      connectedPeople: degree.size,
      connections: edges.length,
      plottedConnections: plottedEdges.length,
      unlocatedConnections: unlocatedEdges.length,
      unresolvedRecords,
      pendingRecords,
      selfRecords,
      duplicateRecords,
    },
  };
}

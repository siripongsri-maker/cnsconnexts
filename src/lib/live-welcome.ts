import { HUB_POINT } from "./live-map-layout";
import { buildPeopleNetwork, type NetworkPerson } from "./people-network";

/** Sources that mean the person registered themselves; admin/demo records never get a greeting. */
export const WELCOME_SOURCES: ReadonlySet<string> = new Set([
  "qr",
  "link",
  "invite",
  "direct",
  "auth",
]);

/** A bigger burst than this is a bulk import, not people arriving, so nobody is greeted. */
export const WELCOME_BATCH_CAP = 10;

export type ArrivalResult = { seen: Set<string>; arrivals: NetworkPerson[] };

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Compare the current users with the ids already seen. `null` sets the baseline
 * (everyone present is seen, nobody is an arrival). Never mutates its input.
 */
export function trackArrivals(
  seen: Set<string> | null,
  users: readonly NetworkPerson[],
): ArrivalResult {
  const next = new Set(seen ?? []);
  const arrivals: NetworkPerson[] = [];
  for (const user of users) {
    const id = String(user.id);
    if (seen && !seen.has(id) && !next.has(id) && user.source && WELCOME_SOURCES.has(user.source)) {
      arrivals.push(user);
    }
    next.add(id);
  }
  arrivals.sort(
    (a, b) =>
      compare(a.created_at ?? "", b.created_at ?? "") || compare(String(a.id), String(b.id)),
  );
  return { seen: next, arrivals: arrivals.length > WELCOME_BATCH_CAP ? [] : arrivals };
}

export type WelcomePin = {
  id: string;
  name: string;
  x: number;
  y: number;
  box: [number, number, number, number];
  placeLabel: string;
  hub: boolean;
};

function outlineBox(d: string): [number, number, number, number] {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    box[0] = Math.min(box[0], numbers[i]!);
    box[2] = Math.max(box[2], numbers[i]!);
    box[1] = Math.min(box[1], numbers[i + 1]!);
    box[3] = Math.max(box[3], numbers[i + 1]!);
  }
  return box;
}

/**
 * Place one welcome pin per person: inside their stated province, or at the hub
 * in the Gulf of Thailand when there is no province to show.
 */
export function placeWelcomePins(
  people: readonly NetworkPerson[],
  allUsers: readonly NetworkPerson[],
): WelcomePin[] {
  const nodes = new Map(buildPeopleNetwork(allUsers, []).nodes.map((node) => [node.id, node]));
  return people.map((person) => {
    const node = nodes.get(person.id);
    if (node) {
      return {
        id: person.id,
        name: person.name,
        x: node.x,
        y: node.y,
        box: outlineBox(node.province.d),
        placeLabel: node.province.th,
        hub: false,
      };
    }
    return {
      id: person.id,
      name: person.name,
      x: HUB_POINT.x,
      y: HUB_POINT.y,
      box: [HUB_POINT.x - 30, HUB_POINT.y - 30, HUB_POINT.x + 30, HUB_POINT.y + 30],
      placeLabel: "ทั่วประเทศ",
      hub: true,
    };
  });
}

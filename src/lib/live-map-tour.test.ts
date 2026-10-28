import { describe, expect, it } from "vitest";

import { buildLiveMapLayout } from "./live-map-layout";
import {
  buildTour,
  GROUP_LABEL,
  regionViewSteps,
  TOUR_LIMITS,
  TOUR_ORDER,
  type TourStep,
} from "./live-map-tour";
import type { NetworkConnection, NetworkPerson } from "./people-network";

function person(id: string, region: string): NetworkPerson {
  return {
    id,
    name: `ชื่อ ${id}`,
    province: "",
    interests: [],
    region: region as NetworkPerson["region"],
  };
}

function pair(id: string, a: string, b: string, created_at?: string): NetworkConnection {
  return {
    id,
    user_a: a,
    user_b: b,
    status: "Connected",
    ...(created_at === undefined ? {} : { created_at }),
  };
}

const day = (n: number) => `2026-01-${String(n).padStart(2, "0")}T00:00:00Z`;

describe("buildTour", () => {
  it("exposes constants", () => {
    expect(TOUR_ORDER).toEqual(["north", "northeast", "central", "south"]);
    expect(TOUR_LIMITS).toEqual({ intraPerRegion: 6, crossPerRegion: 2 });
    expect(GROUP_LABEL.central).toBe("ภาคกลางและกรุงเทพฯ");
  });

  it("empty layout gives no steps", () => {
    expect(buildTour(buildLiveMapLayout([], []))).toEqual([]);
  });

  it("follows region order and skips empty regions", () => {
    const users = [
      person("n1", "North"),
      person("n2", "North"),
      person("s1", "South"),
      person("s2", "South"),
    ];
    const layout = buildLiveMapLayout(users, [
      pair("p1", "n1", "n2", day(1)),
      pair("p2", "s1", "s2", day(2)),
    ]);
    const steps = buildTour(layout);
    expect(steps.map((s) => (s.kind === "overview" ? "overview" : `${s.kind}:${s.group}`))).toEqual(
      ["region:north", "region:south", "overview"],
    );
    const north = steps[0]!;
    expect(north.kind === "region" && north.nodeIds).toEqual(["n1", "n2"]);
  });

  it("caps in-region pairs at 6 newest", () => {
    const users = Array.from({ length: 9 }, (_, i) => person(`c${i}`, "Central"));
    const conns = Array.from({ length: 8 }, (_, i) =>
      pair(`e${i}`, `c${i}`, `c${i + 1}`, day(i + 1)),
    );
    const layout = buildLiveMapLayout(users, conns);
    const region = buildTour(layout).find((s) => s.kind === "region" && s.group === "central")!;
    if (region.kind !== "region") throw new Error("x");
    const newestFirst = [...layout.edges]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 6)
      .map((e) => e.id);
    expect(region.edgeIds).toEqual(newestFirst);
    expect(region.intraCount).toBe(8);
  });

  it("flies a cross pair once", () => {
    const layout = buildLiveMapLayout(
      [person("n1", "North"), person("s1", "South")],
      [pair("x", "n1", "s1", day(1))],
    );
    const steps = buildTour(layout);
    const cross = steps.filter((s) => s.kind === "cross");
    expect(cross).toEqual([
      { kind: "cross", group: "north", edgeId: layout.edges[0]!.id, fromId: "n1", toId: "s1" },
    ]);
    expect(steps.map((s) => s.kind)).toEqual(["region", "cross", "region", "overview"]);
  });

  it("hub pairs fly from the region side", () => {
    const layout = buildLiveMapLayout(
      [person("hub1", "Nationwide"), person("s1", "South")],
      [pair("x", "hub1", "s1", day(1))],
    );
    const steps = buildTour(layout);
    const cross = steps.filter((s) => s.kind === "cross");
    expect(cross).toHaveLength(1);
    expect(cross[0]).toMatchObject({ group: "south", fromId: "s1", toId: "hub1" });
  });

  it("a hub-hub pair appears only in the overview", () => {
    const layout = buildLiveMapLayout(
      [person("h1", "Nationwide"), person("h2", "Nationwide")],
      [pair("x", "h1", "h2", day(1))],
    );
    const steps = buildTour(layout);
    expect(steps.map((s) => s.kind)).toEqual(["overview"]);
    expect(steps[0]).toEqual({ kind: "overview", edgeIds: [layout.edges[0]!.id] });
  });

  it("caps cross flights at 2 per region", () => {
    const users = [
      person("n1", "North"),
      person("n2", "North"),
      person("n3", "North"),
      person("s1", "South"),
    ];
    const layout = buildLiveMapLayout(users, [
      pair("a", "n1", "s1", day(1)),
      pair("b", "n2", "s1", day(2)),
      pair("c", "n3", "s1", day(3)),
    ]);
    const steps = buildTour(layout);
    const cross = steps.filter((s) => s.kind === "cross");
    expect(cross).toHaveLength(2);
    expect(cross.every((s) => s.kind === "cross" && s.group === "north")).toBe(true);
    // newest first
    expect(cross.map((s) => s.kind === "cross" && s.fromId)).toEqual(["n3", "n2"]);
    const north = steps.find((s) => s.kind === "region" && s.group === "north")!;
    expect(north.kind === "region" && north.crossCount).toBe(3);
    const south = steps.find((s) => s.kind === "region" && s.group === "south")!;
    expect(south.kind === "region" && south.crossCount).toBe(3);
  });

  it("overview lists every edge", () => {
    const users = [
      person("n1", "North"),
      person("n2", "North"),
      person("s1", "South"),
      person("h1", "Nationwide"),
      person("h2", "Nationwide"),
    ];
    const layout = buildLiveMapLayout(users, [
      pair("a", "n1", "n2", day(1)),
      pair("b", "n1", "s1", day(2)),
      pair("c", "h1", "h2", day(3)),
      pair("d", "h1", "s1", day(4)),
    ]);
    const steps = buildTour(layout);
    const overview = steps.at(-1)!;
    expect(overview.kind).toBe("overview");
    expect(overview.kind === "overview" && [...overview.edgeIds].sort()).toEqual(
      layout.edges.map((e) => e.id).sort(),
    );
  });
});

describe("regionViewSteps", () => {
  const steps: TourStep[] = [
    {
      kind: "region",
      group: "north",
      nodeIds: ["n1"],
      edgeIds: ["a"],
      intraCount: 1,
      crossCount: 1,
    },
    { kind: "cross", group: "north", edgeId: "x", fromId: "n1", toId: "s1" },
    {
      kind: "region",
      group: "south",
      nodeIds: ["s1"],
      edgeIds: ["b"],
      intraCount: 1,
      crossCount: 1,
    },
    { kind: "cross", group: "south", edgeId: "y", fromId: "s1", toId: "h1" },
    { kind: "overview", edgeIds: ["a", "b", "x", "y"] },
  ];

  it("keeps only steps whose group is the chosen one", () => {
    expect(regionViewSteps(steps, "north")).toEqual([steps[0], steps[1]]);
    expect(regionViewSteps(steps, "central")).toEqual([]);
  });

  it("drops overview steps", () => {
    expect(regionViewSteps(steps, "south").some((s) => s.kind === "overview")).toBe(false);
  });

  it("keeps cross steps whose home group is the chosen one", () => {
    expect(regionViewSteps(steps, "south")).toEqual([steps[2], steps[3]]);
  });

  it("works on a built tour", () => {
    const layout = buildLiveMapLayout(
      [person("n1", "North"), person("n2", "North"), person("s1", "South")],
      [pair("p", "n1", "n2", day(1)), pair("x", "n1", "s1", day(2))],
    );
    const north = regionViewSteps(buildTour(layout), "north");
    expect(north.map((s) => s.kind)).toEqual(["region", "cross"]);
    // The cross pair's far end (south) is not its home, so south has only its region step.
    expect(regionViewSteps(buildTour(layout), "south").map((s) => s.kind)).toEqual(["region"]);
  });
});

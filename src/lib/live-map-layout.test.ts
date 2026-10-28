import { describe, expect, it } from "vitest";

import { buildLiveMapLayout, groupBox, HUB_POINT } from "./live-map-layout";
import {
  buildPeopleNetwork,
  provinceAt,
  type NetworkConnection,
  type NetworkPerson,
} from "./people-network";
import { PROVINCES } from "./thailand-geo";

type PersonOver = Omit<Partial<NetworkPerson>, "region"> & { region?: string };

function person(id: string, over: PersonOver = {}): NetworkPerson {
  return {
    id,
    name: `ชื่อ ${id}`,
    province: "",
    interests: [],
    ...over,
    // The layout must survive stored values outside the `Region` union.
    region: (over.region ?? "Central") as NetworkPerson["region"],
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

describe("buildLiveMapLayout", () => {
  const A = person("a", { province: "Chiang Mai", region: "North" });
  const B = person("b", { province: "", region: "South" });
  const C = person("c", { province: "", region: "Nationwide" });
  const connections = [pair("ab", "a", "b"), pair("bc", "b", "c")];

  it("places every pair", () => {
    const layout = buildLiveMapLayout([A, B, C], connections);
    expect(layout.edges).toHaveLength(2);
    for (const edge of layout.edges) expect(edge.path.startsWith("M ")).toBe(true);
    for (const id of ["a", "b", "c"]) expect(layout.nodesById.has(id)).toBe(true);
    expect(layout.nodes).toHaveLength(3);
    for (const edge of layout.edges) {
      expect(layout.nodesById.has(edge.sourceId)).toBe(true);
      expect(layout.nodesById.has(edge.targetId)).toBe(true);
    }
  });

  it("labels region-only and hub people", () => {
    const layout = buildLiveMapLayout([A, B, C], connections);
    const b = layout.nodesById.get("b")!;
    expect(b.placeLabel).toBe("ไม่ระบุจังหวัด · ภาคใต้");
    expect(b.kind).toBe("region");
    expect(b.group).toBe("south");

    const c = layout.nodesById.get("c")!;
    expect(c.placeLabel).toBe("ทั่วประเทศ");
    expect(c.kind).toBe("hub");
    expect(c.group).toBeNull();
    expect({ x: c.x, y: c.y }).toEqual(HUB_POINT);
  });

  it("hub sits in the sea", () => {
    expect(HUB_POINT).toEqual({ x: 385, y: 900 });
    expect(provinceAt(HUB_POINT)).toBeNull();
  });

  it("puts a known-province person inside that province", () => {
    const a = buildLiveMapLayout([A, B, C], connections).nodesById.get("a")!;
    expect(a.name).toBe("ชื่อ a");
    expect(a.kind).toBe("province");
    expect(a.group).toBe("north");
    expect(a.placeLabel).toBe("เชียงใหม่");
    expect(provinceAt(a)?.en).toBe("Chiang Mai");
    const [x0, y0, x1, y1] = a.box;
    expect(x0).toBeLessThan(a.x);
    expect(a.x).toBeLessThan(x1);
    expect(y0).toBeLessThan(a.y);
    expect(a.y).toBeLessThan(y1);
  });

  it("boxes region and hub people at +/-30 around their dot", () => {
    const layout = buildLiveMapLayout([A, B, C], connections);
    for (const id of ["b", "c"]) {
      const node = layout.nodesById.get(id)!;
      expect(node.box).toEqual([node.x - 30, node.y - 30, node.x + 30, node.y + 30]);
    }
  });

  it("no stacked region-only dots", () => {
    const hub = person("chiangmai", { province: "Chiang Mai", region: "North" });
    const crowd = Array.from({ length: 18 }, (_, i) =>
      person(`r${String(i).padStart(2, "0")}`, { region: "Central" }),
    );
    const layout = buildLiveMapLayout(
      [hub, ...crowd],
      crowd.map((p, i) => pair(`c${i}`, "chiangmai", p.id)),
    );
    const spots = new Set(
      crowd.map((p) => {
        const node = layout.nodesById.get(p.id)!;
        expect(node.kind).toBe("region");
        return `${node.x},${node.y}`;
      }),
    );
    expect(spots.size).toBe(18);
  });

  it("orders a region's ring by person id, not by pair order", () => {
    // Pairs sort as ["a","z"] then ["b","m"], so "z" is met before "m".
    const users = [
      person("a", { province: "Chiang Mai", region: "North" }),
      person("b", { province: "Chiang Mai", region: "North" }),
      person("m", { region: "North" }),
      person("z", { region: "North" }),
    ];
    const layout = buildLiveMapLayout(users, [pair("c1", "a", "z"), pair("c2", "b", "m")]);
    const north = PROVINCES.filter((province) => province.region === "North");
    const cx = north.reduce((sum, province) => sum + province.cx, 0) / north.length;
    const cy = north.reduce((sum, province) => sum + province.cy, 0) / north.length;
    const radius = (id: string) => {
      const node = layout.nodesById.get(id)!;
      return Math.hypot(node.x - cx, node.y - cy);
    };
    expect(radius("m")).toBeCloseTo(24, 5);
    expect(radius("z")).toBeCloseTo(33, 5);
  });

  it("keeps region-only dots the same whatever order the users arrive in", () => {
    const crowd = Array.from({ length: 6 }, (_, i) => person(`r${i}`, { region: "North" }));
    const base = person("base", { province: "Chiang Mai", region: "North" });
    const links = crowd.map((p, i) => pair(`c${i}`, "base", p.id));
    const forward = buildLiveMapLayout([base, ...crowd], links);
    const backward = buildLiveMapLayout([...crowd].reverse().concat(base), [...links].reverse());
    for (const p of crowd) {
      const f = forward.nodesById.get(p.id)!;
      const b = backward.nodesById.get(p.id)!;
      expect([b.x, b.y]).toEqual([f.x, f.y]);
    }
  });

  it("aliases and Bangkok", () => {
    for (const province of ["กรุงเทพฯ", "Bangkok", "กรุงเทพมหานคร"]) {
      const bkk = person("bkk", { province, region: "Bangkok" });
      const layout = buildLiveMapLayout([bkk, A], [pair("c", "a", "bkk")]);
      const node = layout.nodesById.get("bkk")!;
      expect(node.group).toBe("central");
      expect(node.kind).toBe("province");
    }
  });

  it("maps every region to its tour group", () => {
    const expected = {
      North: "north",
      Northeast: "northeast",
      Central: "central",
      Bangkok: "central",
      South: "south",
    } as const;
    for (const [region, group] of Object.entries(expected)) {
      const p = person("p", { region });
      const layout = buildLiveMapLayout([A, p], [pair("c", "a", "p")]);
      expect(layout.nodesById.get("p")?.group).toBe(group);
    }
  });

  it("rings Bangkok region-only people around the Bangkok province centre", () => {
    const p = person("p", { region: "Bangkok" });
    const node = buildLiveMapLayout([A, p], [pair("c", "a", "p")]).nodesById.get("p")!;
    expect(node.kind).toBe("region");
    expect(node.group).toBe("central");
    expect(node.placeLabel).toBe("ไม่ระบุจังหวัด · กรุงเทพฯ");
    const bangkok = PROVINCES.find((province) => province.en === "Bangkok Metropolis")!;
    // The first person in a region sits one base radius (24) from the centre.
    expect(Math.hypot(node.x - bangkok.cx, node.y - bangkok.cy)).toBeCloseTo(24, 5);
  });

  it("treats an unresolvable province like a missing one", () => {
    const p = person("p", { province: "Atlantis", region: "Northeast" });
    const node = buildLiveMapLayout([A, p], [pair("c", "a", "p")]).nodesById.get("p")!;
    expect(node.kind).toBe("region");
    expect(node.group).toBe("northeast");
    expect(node.placeLabel).toBe("ไม่ระบุจังหวัด · ภาคอีสาน");
  });

  it("unknown region falls back to hub", () => {
    for (const region of ["", "Mars", "toString"]) {
      const p = person("p", { province: "", region });
      const node = buildLiveMapLayout([A, p], [pair("c", "a", "p")]).nodesById.get("p")!;
      expect(node.kind).toBe("hub");
      expect(node.group).toBeNull();
      expect(node.placeLabel).toBe("ทั่วประเทศ");
    }
  });

  it("shared interests are the exact intersection", () => {
    const a = person("a", {
      province: "Chiang Mai",
      region: "North",
      interests: ["Youth", "Policy"],
    });
    const b = person("b", { province: "Phuket", region: "South", interests: ["Policy"] });
    const layout = buildLiveMapLayout([a, b], [pair("c", "a", "b")]);
    expect(layout.edges[0]?.sharedInterests).toEqual(["Policy"]);
  });

  it("keeps the source/target orientation of the network and its exact path", () => {
    const users = [
      person("z", { province: "Phuket", region: "South" }),
      person("m", { province: "Chiang Mai", region: "North" }),
    ];
    const links = [pair("c", "z", "m")];
    const layout = buildLiveMapLayout(users, links);
    const network = buildPeopleNetwork(users, links);
    expect(layout.edges).toHaveLength(1);
    const [edge] = layout.edges;
    expect(edge).toMatchObject({ id: network.edges[0]?.id, sourceId: "m", targetId: "z" });
    expect(edge?.path).toBe(network.edges[0]?.path);
  });

  it("uses the newest connection date, and empty when undated", () => {
    const users = [A, person("p", { province: "Phuket", region: "South" })];
    const dated = buildLiveMapLayout(users, [
      pair("c1", "a", "p", "2026-10-01T00:00:00Z"),
      pair("c2", "p", "a", "2026-10-09T00:00:00Z"),
    ]);
    expect(dated.edges).toHaveLength(1);
    expect(dated.edges[0]?.createdAt).toBe("2026-10-09T00:00:00Z");
    const undated = buildLiveMapLayout(users, [pair("c1", "a", "p")]);
    expect(undated.edges[0]?.createdAt).toBe("");
  });

  it("leaves out people with no recorded pair, and demo profiles", () => {
    const lonely = person("lonely", { province: "Phuket", region: "South" });
    const demo = {
      ...person("demo", { province: "Phuket", region: "South" }),
      source: "demo" as const,
    };
    const layout = buildLiveMapLayout(
      [A, B, lonely, demo],
      [pair("ab", "a", "b"), pair("ad", "a", "demo")],
    );
    expect(layout.edges).toHaveLength(1);
    expect([...layout.nodesById.keys()].sort()).toEqual(["a", "b"]);
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("is empty when nothing is connected", () => {
    const layout = buildLiveMapLayout([A, B], []);
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.nodesById.size).toBe(0);
  });
});

describe("groupBox", () => {
  it("is the union of the province boxes in the group", () => {
    const users = [
      person("n", { province: "Chiang Mai", region: "North" }),
      person("s", { province: "Songkhla", region: "South" }),
      person("c", { province: "Bangkok", region: "Bangkok" }),
      person("k", { province: "Kanchanaburi", region: "Central" }),
      person("e", { province: "Khon Kaen", region: "Northeast" }),
    ];
    const layout = buildLiveMapLayout(
      users,
      ["s", "c", "k", "e"].map((id) => pair(`c-${id}`, "n", id)),
    );
    for (const group of ["north", "northeast", "central", "south"] as const) {
      const [gx0, gy0, gx1, gy1] = groupBox(group);
      expect(gx0).toBeLessThan(gx1);
      expect(gy0).toBeLessThan(gy1);
      for (const node of layout.nodes.filter((n) => n.group === group)) {
        const [x0, y0, x1, y1] = node.box;
        expect(gx0).toBeLessThanOrEqual(x0);
        expect(gy0).toBeLessThanOrEqual(y0);
        expect(gx1).toBeGreaterThanOrEqual(x1);
        expect(gy1).toBeGreaterThanOrEqual(y1);
      }
    }
  });

  it("stacks the groups from north to south", () => {
    expect(groupBox("north")[1]).toBeLessThan(groupBox("central")[1]);
    expect(groupBox("central")[3]).toBeLessThan(groupBox("south")[3]);
  });
});

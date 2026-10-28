import { describe, expect, it } from "vitest";
import { HUB_POINT } from "./live-map-layout";
import { provinceAt, type NetworkPerson } from "./people-network";
import {
  MAX_STEP_REPLAYS,
  WELCOME_BATCH_CAP,
  afterTourStep,
  placeWelcomePins,
  trackArrivals,
} from "./live-welcome";

const person = (id: string, over: Partial<NetworkPerson> = {}): NetworkPerson => ({
  id,
  name: `Person ${id}`,
  province: "",
  region: "Central",
  interests: [],
  source: "qr",
  created_at: "2026-10-28T10:00:00Z",
  ...over,
});

const noDate = (id: string): NetworkPerson => {
  const { created_at: _omit, ...rest } = person(id);
  return rest;
};

describe("trackArrivals", () => {
  it("baseline yields no arrivals", () => {
    const users = [person("a"), person("b")];
    const r = trackArrivals(null, users);
    expect(r.arrivals).toEqual([]);
    expect([...r.seen].sort()).toEqual(["a", "b"]);
  });

  it("new self-registered user is an arrival", () => {
    const { seen } = trackArrivals(null, [person("a")]);
    const r = trackArrivals(seen, [person("a"), person("b")]);
    expect(r.arrivals.map((p) => p.id)).toEqual(["b"]);
    expect(r.seen.has("b")).toBe(true);
    expect(seen.has("b")).toBe(false);
  });

  it("admin and demo sources never arrive", () => {
    const { seen } = trackArrivals(null, []);
    const r = trackArrivals(seen, [
      person("a", { source: "admin" }),
      person("d", { source: "demo" }),
      person("n", { source: undefined }),
    ]);
    expect(r.arrivals).toEqual([]);
    expect(r.seen.has("a") && r.seen.has("d") && r.seen.has("n")).toBe(true);
  });

  it("more than 10 at once yields none but marks seen", () => {
    const users = Array.from({ length: WELCOME_BATCH_CAP + 1 }, (_, i) => person(`u${i}`));
    const first = trackArrivals(new Set(), users);
    expect(first.arrivals.length).toBe(0);
    expect(first.seen.size).toBe(11);
    expect(trackArrivals(first.seen, users).arrivals.length).toBe(0);
  });

  it("a user is welcomed once across refreshes", () => {
    const users = [person("a")];
    const r1 = trackArrivals(new Set(), users);
    expect(r1.arrivals.length).toBe(1);
    expect(trackArrivals(r1.seen, users).arrivals).toEqual([]);
  });

  it("arrivals are ordered by created_at then id", () => {
    const r = trackArrivals(new Set(), [
      person("c", { created_at: "2026-10-28T10:00:02Z" }),
      person("b", { created_at: "2026-10-28T10:00:01Z" }),
      person("a", { created_at: "2026-10-28T10:00:01Z" }),
      noDate("z"),
    ]);
    expect(r.arrivals.map((p) => p.id)).toEqual(["z", "a", "b", "c"]);
  });
});

describe("placeWelcomePins", () => {
  it("pin sits inside the stated province", () => {
    const a = person("a", { province: "Nan" });
    const [pin] = placeWelcomePins([a], [a, person("b", { province: "Nan" })]);
    expect(pin!.hub).toBe(false);
    expect(pin!.placeLabel).toBe("น่าน");
    expect(provinceAt(pin!)?.en).toBe("Nan");
    const [x0, y0, x1, y1] = pin!.box;
    expect(pin!.x >= x0 && pin!.x <= x1 && pin!.y >= y0 && pin!.y <= y1).toBe(true);
  });

  it("unresolvable or empty province goes to the hub labelled ทั่วประเทศ", () => {
    const pins = placeWelcomePins(
      [person("a", { province: "" }), person("b", { province: "Atlantis" })],
      [],
    );
    for (const pin of pins) {
      expect(pin).toMatchObject({
        x: HUB_POINT.x,
        y: HUB_POINT.y,
        hub: true,
        placeLabel: "ทั่วประเทศ",
      });
      expect(pin.box).toEqual([
        HUB_POINT.x - 30,
        HUB_POINT.y - 30,
        HUB_POINT.x + 30,
        HUB_POINT.y + 30,
      ]);
    }
  });

  it("Bangkok alias resolves to Bangkok Metropolis", () => {
    const a = person("a", { province: "Bangkok" });
    const [pin] = placeWelcomePins([a], [a]);
    expect(pin!.hub).toBe(false);
    expect(provinceAt(pin!)?.en).toBe("Bangkok Metropolis");
  });
});

describe("afterTourStep", () => {
  it("advances and resets after a completed step", () => {
    expect(afterTourStep(true, 0)).toEqual({ advance: true, replays: 0 });
    expect(afterTourStep(true, 1)).toEqual({ advance: true, replays: 0 });
  });

  it("replays an interrupted step once, then moves on", () => {
    expect(MAX_STEP_REPLAYS).toBe(1);
    const first = afterTourStep(false, 0);
    expect(first).toEqual({ advance: false, replays: 1 });
    expect(afterTourStep(false, first.replays)).toEqual({ advance: true, replays: 0 });
  });

  it("never stalls on one step under constant interruptions", () => {
    let i = 0;
    let replays = 0;
    for (let n = 0; n < 6; n++) {
      const next = afterTourStep(false, replays);
      replays = next.replays;
      if (next.advance) i++;
    }
    expect(i).toBe(3);
  });
});

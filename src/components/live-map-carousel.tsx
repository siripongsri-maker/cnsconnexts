import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { issueTh } from "@/lib/i18n";
import { subscribeControl } from "@/lib/live-control-channel";
import {
  DEFAULT_CONTROL_STATE,
  edgeMatchesIssue,
  scaleTiming,
  type LiveControlState,
} from "@/lib/live-controls";
import { countrySlotPlan } from "@/lib/live-country-slots";
import {
  buildLiveMapLayout,
  groupBox,
  type LiveMapEdge,
  type LiveMapLayout,
  type LiveMapNode,
  type TourGroupKey,
} from "@/lib/live-map-layout";
import { buildTour, GROUP_LABEL, regionViewSteps, type TourStep } from "@/lib/live-map-tour";
import {
  afterTourStep,
  placeWelcomePins,
  trackArrivals,
  type WelcomePin,
} from "@/lib/live-welcome";
import { useMotionSettings } from "@/lib/motion";
import { buildPeopleNetwork, type NetworkPerson } from "@/lib/people-network";
import { useStore } from "@/lib/store";
import { PROVINCES } from "@/lib/thailand-geo";
import type { Connection, Region, User } from "@/lib/types";

/** Same palette as `REGION_FILL` in live-thailand-map.tsx (kept in step by hand). */
const REGION_FILL: Record<Region, string> = {
  North: "var(--color-block-purple)",
  Northeast: "var(--color-block-orange)",
  Central: "var(--color-block-blue)",
  Bangkok: "var(--color-ink)",
  South: "var(--color-block-green)",
  Nationwide: "var(--color-block-teal)",
};

const EDGE_COLORS = [
  "var(--color-primary)",
  "var(--color-block-blue)",
  "var(--color-block-orange)",
  "var(--color-block-green)",
  "var(--color-block-purple)",
  "var(--color-block-teal)",
];

/**
 * The morning-light big screen (`.live-morning`): line colours and label inks.
 * Region fills for this look come from CSS (`src/styles/live-morning.css`,
 * `[data-region]` on the province paths). No glow filter.
 */
const MORNING_EDGE_COLORS = ["#6a2c91", "#1488d8", "#f47b20", "#5da130", "#129e8c", "#f2b21b"];

/** Map visuals per look: "meadow" is the default theme, "morning" the big screen. */
const LOOKS = {
  meadow: {
    edges: EDGE_COLORS,
    name: "var(--color-ink)",
    place: "var(--color-ink-soft)",
    halo: "var(--color-paper)",
  },
  morning: { edges: MORNING_EDGE_COLORS, name: "#2b2878", place: "#5d5a73", halo: "#fffdf8" },
} as const;

export type LiveMapLook = keyof typeof LOOKS;
type LookColors = (typeof LOOKS)[LiveMapLook];

const PROVINCE_GROUP: Partial<Record<Region, TourGroupKey>> = {
  North: "north",
  Northeast: "northeast",
  Central: "central",
  Bangkok: "central",
  South: "south",
};

/**
 * Timings (ms). Camera and line drawing drop to 0 with reduced motion / low spec
 * or still mode. Tour timings are scaled by the operator's speed at the call
 * site (`scaleTiming`); the welcome timings never are.
 */
const TIMING = {
  camera: 2600,
  draw: 2400,
  regionHold: 3000,
  crossCamera: 2400,
  crossHold: 3200,
  overviewHold: 8000,
  /** Overview lines start one after another, spread over at most this long. */
  overviewSpread: 4000,
  overviewGap: 60,
  /** Country view: each pair holds this long after its line draws. */
  countryHold: 3000,
  /** How often an empty map checks for new pairs. */
  idleRecheck: 2000,
  /** Welcome for new registrants: camera, dot grow-in, one halo, hold. */
  welcomeCamera: 2600,
  welcomeDot: 600,
  welcomeHalo: 1800,
  welcomeHold: 5000,
};

/** On-screen sizes in CSS px, divided by the current map scale. */
const PX = {
  dot: 7,
  regionDot: 5,
  dotStroke: 2.5,
  name: 17,
  place: 12.5,
  halo: 4,
  labelX: 11,
  line: 5,
  pin: 10,
  pinRing: 3,
  pinHaloReach: 64,
  pinHaloStroke: 3,
  /** Pair bubbles: about 2× the name/place labels, readable from the back of the hall. */
  bubbleName: 34,
  bubblePlace: 25,
  /** The bubble is centred in a box this big (on-screen px); text past it is cut. */
  bubbleBoxW: 760,
  bubbleBoxH: 220,
};

/** At most this many pair bubbles show at once (newest kept). */
const MAX_BUBBLES = 6;

/** Welcome pins: brand purple with a white ring. */
const PIN_COLOR = "#6a2c91";
const PIN_RING = "#ffffff";
/** The welcome card names at most this many people, then "และอีก N คน". */
const WELCOME_NAMES = 3;

/** At most this many people carry a name/place label at once. */
const MAX_LABELS = 12;

type ViewBox = { x: number; y: number; w: number; h: number };
type Box = [number, number, number, number];

/** The whole country, as framed by the overview. */
const FULL: ViewBox = { x: 120, y: 20, w: 760, h: 1560 };
const FULL_VIEWBOX = `${FULL.x} ${FULL.y} ${FULL.w} ${FULL.h}`;
/** Approximate scale for the server-rendered frame; corrected on mount. */
const DEFAULT_SCALE = 0.33;

function fit([x0, y0, x1, y1]: Box, pad: number): ViewBox {
  let w = x1 - x0;
  let h = y1 - y0;
  const min = 280;
  if (w < min) {
    x0 -= (min - w) / 2;
    w = min;
  }
  if (h < min) {
    y0 -= (min - h) / 2;
    h = min;
  }
  return { x: x0 - w * pad, y: y0 - h * pad, w: w * (1 + 2 * pad), h: h * (1 + 2 * pad) };
}

const union = (a: Box, b: Box): Box => [
  Math.min(a[0], b[0]),
  Math.min(a[1], b[1]),
  Math.max(a[2], b[2]),
  Math.max(a[3], b[3]),
];

const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);

type SceneEdge = { id: string; animate: boolean };

type Scene = {
  /** Changes per region run / overview so edge elements remount (and redraw). */
  key: number;
  /** Groups shaded strongly; null = overview shading for every province. */
  shade: TourGroupKey[] | null;
  visible: Set<string> | "all";
  labelled: Set<string>;
  /** "all" = every pair, already drawn (the static first frame). */
  edges: SceneEdge[] | "all";
  chip: { title: string; meta: string } | null;
  card: { fromId: string; toId: string; edgeId: string } | null;
  /** Pairs carrying a name bubble (bubbles on), in the order they drew. */
  bubbles: string[];
};

const INITIAL_SCENE: Scene = {
  key: 0,
  shade: null,
  visible: "all",
  labelled: new Set(),
  edges: "all",
  chip: null,
  card: null,
  bubbles: [],
};

type Latest = { layout: LiveMapLayout; issuesById: ReadonlyMap<string, readonly string[]> };

/** Only the pairs matching `issue` (and the people on them); same object when no filter. */
function filterLayout(
  layout: LiveMapLayout,
  issuesById: ReadonlyMap<string, readonly string[]>,
  issue: string | null,
): LiveMapLayout {
  if (issue === null) return layout;
  const edges = layout.edges.filter((e) => edgeMatchesIssue(e, issuesById, issue));
  const keep = new Set(edges.flatMap((e) => [e.sourceId, e.targetId]));
  const nodes = layout.nodes.filter((n) => keep.has(n.id));
  return { nodes, nodesById: new Map(nodes.map((n) => [n.id, n])), edges };
}

/** Point halfway along a pair's quadratic (or loop's cubic) path; node midpoint otherwise. */
function pathMidpoint(edge: LiveMapEdge, layout: LiveMapLayout): { x: number; y: number } | null {
  const n = (edge.path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (n.length === 6) {
    return {
      x: 0.25 * n[0]! + 0.5 * n[2]! + 0.25 * n[4]!,
      y: 0.25 * n[1]! + 0.5 * n[3]! + 0.25 * n[5]!,
    };
  }
  if (n.length === 8) {
    return {
      x: 0.125 * n[0]! + 0.375 * n[2]! + 0.375 * n[4]! + 0.125 * n[6]!,
      y: 0.125 * n[1]! + 0.375 * n[3]! + 0.375 * n[5]! + 0.125 * n[7]!,
    };
  }
  const a = layout.nodesById.get(edge.sourceId);
  const b = layout.nodesById.get(edge.targetId);
  return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;
}

const sameFilter = (a: LiveControlState, b: LiveControlState) =>
  a.issue === b.issue &&
  a.view.kind === b.view.kind &&
  (a.view.kind === "country" || (b.view.kind === "region" && a.view.group === b.view.group));

/** A welcome in progress; `shown` once the camera has arrived and the pins are up. */
type Welcome = { key: number; pins: WelcomePin[]; shown: boolean; halo: boolean };

const sameView = (a: ViewBox, b: ViewBox) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/**
 * Cancellable timers for the tour runner. After `cancel()`, pending waits
 * resolve straight away (so the runner can notice and stop) and nothing new is
 * scheduled.
 */
function createRunner() {
  let cancelled = false;
  const timeouts = new Map<ReturnType<typeof setTimeout>, () => void>();
  const frames = new Map<number, () => void>();
  return {
    get cancelled() {
      return cancelled;
    },
    sleep(ms: number) {
      return new Promise<void>((resolve) => {
        if (cancelled) return resolve();
        const id = setTimeout(() => {
          timeouts.delete(id);
          resolve();
        }, ms);
        timeouts.set(id, resolve);
      });
    },
    frame() {
      return new Promise<number>((resolve) => {
        if (cancelled) return resolve(0);
        const id = requestAnimationFrame((t) => {
          frames.delete(id);
          resolve(t);
        });
        frames.set(id, () => resolve(0));
      });
    },
    cancel() {
      cancelled = true;
      timeouts.forEach((resolve, id) => {
        clearTimeout(id);
        resolve();
      });
      frames.forEach((resolve, id) => {
        cancelAnimationFrame(id);
        resolve();
      });
      timeouts.clear();
      frames.clear();
    },
  };
}
type Runner = ReturnType<typeof createRunner>;

/** Run `onFrame(k)` with k from 0 to 1 over `ms`; with ms 0, just the final frame. */
async function tween(runner: Runner, ms: number, onFrame: (elapsed: number) => boolean) {
  if (ms <= 0) {
    onFrame(Infinity);
    return;
  }
  const start = await runner.frame();
  if (runner.cancelled) return;
  let done = onFrame(0);
  while (!done) {
    const t = await runner.frame();
    if (runner.cancelled) return;
    done = onFrame(t - start);
  }
}

/**
 * Labels for the pairs drawn so far: their endpoints, newest pair first, until
 * the next pair would go over MAX_LABELS.
 */
function pairLabels(layout: LiveMapLayout, edgeIds: readonly string[]): Set<string> {
  const labels = new Set<string>();
  for (let i = edgeIds.length - 1; i >= 0; i--) {
    const edge = layout.edges.find((e) => e.id === edgeIds[i]);
    if (!edge) continue;
    const next = new Set([...labels, edge.sourceId, edge.targetId]);
    if (next.size > MAX_LABELS) break;
    next.forEach((id) => labels.add(id));
  }
  return labels;
}

function crossTotal(layout: LiveMapLayout) {
  let cross = 0;
  for (const edge of layout.edges) {
    const a = layout.nodesById.get(edge.sourceId);
    const b = layout.nodesById.get(edge.targetId);
    if (a && b && a.group !== b.group) cross++;
  }
  return cross;
}

/**
 * The big-screen map, steered by the operator's control state (`control`, or
 * the `kns-live-control` channel when no prop is given):
 *
 * - Country view (default): the camera stays on the whole country; each round
 *   draws up to four pairs together (`countrySlotPlan`), each holding after its
 *   line draws, then the next round's pairs take the slots.
 * - Region view: the region tour for one region, looped: the camera eases in,
 *   the region's people appear as dots, its pairs draw one at a time, then up to
 *   two cross-region pairs that start in it. No overview.
 *
 * The issue filter applies to the pairs before either view. Speed scales the
 * tour timings; still mode (and reduced motion / low spec) sets the camera
 * directly and shows lines in full. With bubbles on, each drawn pair carries a
 * large name bubble at its midpoint; otherwise its two people get the small
 * name/place labels (at most MAX_LABELS at once). New settings are picked up at
 * the next step boundary; the map is never cleared mid-step.
 *
 * People who register after the first participants fetch get a welcome: the
 * current step is cut off, the camera frames their provinces, their pins and a
 * welcome card show for a while, and then the interrupted step replays from
 * its beginning (once; a second interruption moves on to the next step). The welcome draws on the same map, so it also runs while the
 * tour is empty. Welcome timings are never scaled by speed.
 */
export function LiveMapCarousel({
  users,
  allUsers = users,
  connections,
  look = "meadow",
  control,
}: {
  /** What the tour draws (may be filtered). */
  users: User[];
  /** Everyone, unfiltered: decides who is new and where their welcome pins go. */
  allUsers?: User[];
  connections: Connection[];
  /** "morning" when rendered inside the big screen's `.live-morning` wrapper. */
  look?: LiveMapLook;
  /** Operator settings; when left out, the screen listens on the control channel. */
  control?: LiveControlState;
}) {
  const colors = LOOKS[look];
  const fullLayout = useMemo(() => buildLiveMapLayout(users, connections), [users, connections]);
  /**
   * Policy issues per person, from the unfiltered list, for the issue filter.
   * A participant's policy issues ("ประเด็นที่ใส่ใจ", from `ISSUES`) are `User.interests`.
   */
  const issuesById = useMemo(
    () => new Map<string, readonly string[]>(allUsers.map((u) => [u.id, u.interests])),
    [allUsers],
  );

  // ---- Operator control -------------------------------------------------------

  const controlled = control !== undefined;
  const [heard, setHeard] = useState<LiveControlState>(DEFAULT_CONTROL_STATE);
  useEffect(() => {
    if (controlled) return;
    return subscribeControl(setHeard);
  }, [controlled]);
  const wanted = control ?? heard;
  /** The latest settings; the runner adopts them at its next step boundary. */
  const controlRef = useRef(wanted);
  useEffect(() => {
    controlRef.current = wanted;
  }, [wanted]);
  /** The settings the runner is playing with now. */
  const [applied, setApplied] = useState<LiveControlState>(wanted);
  const appliedRef = useRef(applied);

  const layout = useMemo(
    () => filterLayout(fullLayout, issuesById, applied.issue),
    [fullLayout, issuesById, applied.issue],
  );
  const edgesById = useMemo(() => new Map(layout.edges.map((e) => [e.id, e])), [layout]);

  const latestRef = useRef<Latest>({ layout: fullLayout, issuesById });
  useEffect(() => {
    latestRef.current = { layout: fullLayout, issuesById };
  }, [fullLayout, issuesById]);

  const motion = useMotionSettings();
  const motionRef = useRef(motion);
  useEffect(() => {
    motionRef.current = motion;
  }, [motion]);

  const [scene, setScene] = useState<Scene>(INITIAL_SCENE);
  const [welcome, setWelcome] = useState<Welcome | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const vbRef = useRef<ViewBox>(FULL);

  /** No pairs at all (before any issue/view choice). */
  const empty = fullLayout.edges.length === 0;
  /** Pairs exist, but none in the chosen view and issue. */
  const viewEmpty = useMemo(() => {
    if (empty) return false;
    return applied.view.kind === "country"
      ? layout.edges.length === 0
      : regionViewSteps(buildTour(layout), applied.view.group).length === 0;
  }, [empty, layout, applied.view]);

  // ---- New registrants ----------------------------------------------------------

  const { hydrated } = useStore();
  const usersRef = useRef<User[]>(allUsers);
  /** Ids already seen this screen session; null until the first fetch is in. */
  const seenRef = useRef<Set<string> | null>(null);
  /** People waiting for a welcome. */
  const queueRef = useRef<NetworkPerson[]>([]);
  /** The tour step playing now, so an arrival can cut it off. */
  const stepRef = useRef<Runner | null>(null);

  useEffect(() => {
    usersRef.current = allUsers;
    // The first completed fetch is the baseline, even when it is empty.
    if (!hydrated) return;
    const { seen, arrivals } = trackArrivals(seenRef.current, allUsers);
    seenRef.current = seen;
    if (arrivals.length === 0) return;
    queueRef.current.push(...arrivals);
    stepRef.current?.cancel();
  }, [hydrated, allUsers]);

  // ---- Imperative view updates (viewBox + constant on-screen sizing) ----------

  const applyView = useRef(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const vb = vbRef.current;
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    // clientWidth/clientHeight are layout sizes, unaffected by the present
    // mode's rotate/scale transforms.
    const width = svg.clientWidth || svg.parentElement?.clientWidth || 0;
    const height = svg.clientHeight || svg.parentElement?.clientHeight || 0;
    const scale = Math.min(width / vb.w, height / vb.h) || DEFAULT_SCALE;
    svg.querySelectorAll<SVGGElement>("[data-node]").forEach((g) => {
      g.setAttribute(
        "transform",
        `translate(${g.dataset["x"]} ${g.dataset["y"]}) scale(${1 / scale})`,
      );
    });
    svg.querySelectorAll<SVGPathElement>("[data-edge]").forEach((path) => {
      path.setAttribute("stroke-width", String(PX.line / scale));
    });
  }).current;

  // After every commit (new nodes/edges/pins).
  useLayoutEffect(() => {
    applyView();
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => applyView());
    observer.observe(svg);
    return () => observer.disconnect();
  }, [applyView]);

  // ---- Tour runner ------------------------------------------------------------

  useEffect(() => {
    if (!motion.ready) return;
    // Every tour step and every welcome gets its own runner, so a welcome can
    // cancel just the step that is playing. Unmounting cancels them all.
    let stopped = false;
    const live = new Set<Runner>();
    const spawn = () => {
      const r = createRunner();
      if (stopped) r.cancel();
      live.add(r);
      return r;
    };
    const release = (r: Runner) => {
      live.delete(r);
      if (stepRef.current === r) stepRef.current = null;
    };
    let seq = 0;

    const reduced = () => motionRef.current.reducedMotion || motionRef.current.lowSpec;
    /** Tour steps: no camera moves or line-draw animation. */
    const still = () => reduced() || appliedRef.current.motion === "still";
    /** A tour timing at the operator's speed (welcome timings are never scaled). */
    const tourMs = (ms: number) => scaleTiming(ms, appliedRef.current.speed);
    const bubblesOn = () => appliedRef.current.bubbles;

    /** The latest layout, narrowed to the adopted issue (cached per input). */
    let cache: { src: LiveMapLayout; issue: string | null; out: LiveMapLayout } | null = null;
    const current = () => {
      const { layout: src, issuesById: issues } = latestRef.current;
      const issue = appliedRef.current.issue;
      if (!cache || cache.src !== src || cache.issue !== issue) {
        cache = { src, issue, out: filterLayout(src, issues, issue) };
      }
      return cache.out;
    };

    /** Take up the latest operator settings (only ever at a step boundary). */
    const adopt = () => {
      const next = controlRef.current;
      if (next === appliedRef.current) return;
      appliedRef.current = next;
      flushSync(() => setApplied(next));
    };

    const chipMeta = (meta: string) => {
      const issue = appliedRef.current.issue;
      if (issue === null) return meta;
      return meta ? `ประเด็น ${issueTh(issue)} · ${meta}` : `ประเด็น ${issueTh(issue)}`;
    };

    const commit = (r: Runner, update: (prev: Scene) => Scene) => {
      if (r.cancelled) return;
      flushSync(() => setScene(update));
    };

    const fly = async (r: Runner, to: ViewBox, ms: number, instant: boolean) => {
      const from = { ...vbRef.current };
      const duration = instant ? 0 : ms;
      await tween(r, duration, (elapsed) => {
        const k = duration > 0 ? easeInOutCubic(Math.min(1, elapsed / duration)) : 1;
        vbRef.current = {
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
          w: from.w + (to.w - from.w) * k,
          h: from.h + (to.h - from.h) * k,
        };
        applyView();
        return k >= 1;
      });
    };

    /** Draw the given (already rendered, hidden) edges, each `gap` ms after the last. */
    const draw = async (r: Runner, key: number, ids: string[], ms: number, gap = 0) => {
      const svg = svgRef.current;
      if (!svg || ids.length === 0) return;
      const paths = ids
        .map((id) => svg.querySelector<SVGPathElement>(`[data-edge="${key}:${CSS.escape(id)}"]`))
        .filter((p): p is SVGPathElement => p !== null);
      const duration = still() ? 0 : ms;
      await tween(r, duration, (elapsed) => {
        let done = true;
        paths.forEach((path, i) => {
          const k = duration > 0 ? Math.min(1, Math.max(0, (elapsed - i * gap) / duration)) : 1;
          if (k < 1) done = false;
          path.style.strokeDashoffset = String(1 - easeOutCubic(k));
        });
        return done;
      });
    };

    /**
     * Add a pair to the scene; with `label` (and bubbles off), show names for the
     * pairs drawn so far.
     */
    const addEdge = (r: Runner, id: string, label = false) =>
      commit(r, (prev) => {
        if (prev.edges === "all" || prev.edges.some((e) => e.id === id)) return prev;
        const edges = [...prev.edges, { id, animate: !still() }];
        const labelled =
          label && !bubblesOn()
            ? pairLabels(
                current(),
                edges.map((e) => e.id),
              )
            : prev.labelled;
        return { ...prev, edges, labelled };
      });

    /** Once their lines are drawn, give these pairs a bubble (bubbles on). */
    const addBubbles = (r: Runner, ids: string[]) => {
      if (!bubblesOn() || ids.length === 0) return;
      commit(r, (prev) => ({
        ...prev,
        bubbles: [...prev.bubbles.filter((id) => !ids.includes(id)), ...ids].slice(-MAX_BUBBLES),
      }));
    };

    type RegionContext = {
      group: TourGroupKey;
      key: number;
      members: string[];
      partners: string[];
      meta: string;
    };
    let region: RegionContext | null = null;

    const regionContext = (group: TourGroupKey, nodeIds: string[], meta: string): RegionContext => {
      const now = current();
      const members = nodeIds.filter((id) => now.nodesById.has(id));
      const partners = new Set<string>();
      for (const edge of now.edges) {
        const a = now.nodesById.get(edge.sourceId);
        const b = now.nodesById.get(edge.targetId);
        if (!a || !b || a.group === b.group) continue;
        if (a.group === group) partners.add(b.id);
        if (b.group === group) partners.add(a.id);
      }
      return { group, key: ++seq, members, partners: [...partners], meta };
    };

    const playRegion = async (r: Runner, step: Extract<TourStep, { kind: "region" }>) => {
      const now = current();
      const ctx = regionContext(
        step.group,
        step.nodeIds,
        `${step.intraCount} คู่ในภาค · ${step.crossCount} คู่ข้ามภาค`,
      );
      const edgeIds = step.edgeIds.filter((id) => now.edges.some((e) => e.id === id));
      if (ctx.members.length === 0 && edgeIds.length === 0) return;
      region = ctx;
      commit(r, () => ({
        key: ctx.key,
        shade: [ctx.group],
        visible: new Set([...ctx.members, ...ctx.partners]),
        // Names appear only as each pair draws, so a busy region stays readable.
        labelled: new Set(),
        edges: [],
        chip: { title: GROUP_LABEL[ctx.group], meta: chipMeta(ctx.meta) },
        card: null,
        bubbles: [],
      }));
      await fly(r, fit(groupBox(ctx.group), 0.14), tourMs(TIMING.camera), still());
      for (const id of edgeIds) {
        if (r.cancelled) return;
        if (!current().edges.some((e) => e.id === id)) continue;
        addEdge(r, id, true);
        await draw(r, ctx.key, [id], tourMs(TIMING.draw));
        addBubbles(r, [id]);
      }
      await r.sleep(tourMs(TIMING.regionHold));
    };

    const playCross = async (r: Runner, step: Extract<TourStep, { kind: "cross" }>) => {
      const now = current();
      const from = now.nodesById.get(step.fromId);
      const to = now.nodesById.get(step.toId);
      if (!from || !to || !now.edges.some((e) => e.id === step.edgeId)) return;
      // The region step may have been skipped; then frame the region afresh.
      const ctx =
        region?.group === step.group
          ? region
          : regionContext(
              step.group,
              now.nodes.filter((n) => n.group === step.group).map((n) => n.id),
              "",
            );
      const fresh = ctx !== region;
      region = ctx;
      const toGroup = to.group;
      commit(r, (prev) => ({
        key: ctx.key,
        shade: toGroup ? [ctx.group, toGroup] : [ctx.group],
        visible: new Set([...ctx.members, ...ctx.partners, from.id, to.id]),
        labelled: bubblesOn() ? new Set() : new Set([from.id, to.id]),
        edges: fresh || prev.edges === "all" ? [] : prev.edges,
        chip: {
          title: `${GROUP_LABEL[ctx.group]} → ${toGroup ? GROUP_LABEL[toGroup] : "ทั่วประเทศ"}`,
          meta: chipMeta(ctx.meta),
        },
        card: { fromId: from.id, toId: to.id, edgeId: step.edgeId },
        // Just this pair is named, as with the small labels.
        bubbles: [],
      }));
      await fly(r, fit(union(from.box, to.box), 0.3), tourMs(TIMING.crossCamera), still());
      if (r.cancelled) return;
      addEdge(r, step.edgeId);
      await draw(r, ctx.key, [step.edgeId], tourMs(TIMING.draw));
      addBubbles(r, [step.edgeId]);
      await r.sleep(tourMs(TIMING.crossHold));
    };

    /** Country view: this round's pairs (up to four) draw together over the whole map. */
    const playCountry = async (r: Runner, round: number) => {
      const now = current();
      const ids = countrySlotPlan(now.edges, round);
      if (ids.length === 0) return;
      region = null;
      const key = ++seq;
      const animate = !still();
      const visible = new Set<string>();
      for (const id of ids) {
        const edge = now.edges.find((e) => e.id === id);
        if (edge) visible.add(edge.sourceId).add(edge.targetId);
      }
      // One commit: the previous round's lines give way to this round's in place.
      commit(r, () => ({
        key,
        shade: null,
        visible,
        labelled: bubblesOn() ? new Set() : pairLabels(now, ids),
        edges: ids.map((id) => ({ id, animate })),
        chip: {
          title: "ทั่วประเทศ",
          meta: chipMeta(`เส้นบนแผนที่ ${now.edges.length} คู่ · ข้ามภาค ${crossTotal(now)} คู่`),
        },
        card: null,
        bubbles: [],
      }));
      if (!sameView(vbRef.current, FULL)) {
        await fly(r, FULL, tourMs(TIMING.camera), still());
        if (r.cancelled) return;
      }
      await draw(r, key, ids, tourMs(TIMING.draw));
      addBubbles(r, ids);
      await r.sleep(tourMs(TIMING.countryHold));
    };

    const playStep = (r: Runner, step: TourStep) =>
      step.kind === "region"
        ? playRegion(r, step)
        : step.kind === "cross"
          ? playCross(r, step)
          : Promise.resolve();

    /** Nothing to show: the whole country (again, after a welcome), no lines, and wait. */
    const playIdle = async (r: Runner) => {
      region = null;
      commit(r, (prev) =>
        prev.chip ||
        prev.card ||
        prev.shade ||
        prev.bubbles.length > 0 ||
        (prev.edges !== "all" && prev.edges.length > 0)
          ? { ...INITIAL_SCENE, key: ++seq, edges: [] }
          : prev,
      );
      if (!sameView(vbRef.current, FULL)) await fly(r, FULL, tourMs(TIMING.camera), still());
      await r.sleep(TIMING.idleRecheck);
    };

    /** Play one tour step; false when a welcome cut it off (or the screen closed). */
    const attempt = async (play: (r: Runner) => Promise<void>) => {
      const r = spawn();
      stepRef.current = r;
      await play(r);
      release(r);
      return !r.cancelled;
    };

    /** The dot grows in and one halo expands and fades; reduced motion: final frame. */
    const growPins = async (r: Runner, key: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const pins = [...svg.querySelectorAll<SVGGElement>(`[data-welcome="${key}"]`)];
      const duration = reduced() ? 0 : TIMING.welcomeHalo;
      await tween(r, duration, (elapsed) => {
        const dot = duration > 0 ? Math.min(1, elapsed / TIMING.welcomeDot) : 1;
        const halo = duration > 0 ? Math.min(1, elapsed / duration) : 1;
        pins.forEach((pin) => {
          pin
            .querySelector("[data-welcome-dot]")
            ?.setAttribute("transform", `scale(${easeOutCubic(dot)})`);
          const ring = pin.querySelector("[data-welcome-halo]");
          if (!ring) return;
          ring.setAttribute("r", String(PX.pin + (PX.pinHaloReach - PX.pin) * easeOutCubic(halo)));
          ring.setAttribute("opacity", String(0.7 * (1 - halo)));
        });
        return halo >= 1;
      });
    };

    /** Welcome everyone queued right now, on its own runner (arrivals wait for the next). */
    const playWelcome = async () => {
      const r = spawn();
      const pins = placeWelcomePins(queueRef.current.splice(0), usersRef.current);
      if (pins.length > 0) {
        const key = ++seq;
        const show = (next: Welcome | null) => {
          if (!r.cancelled) flushSync(() => setWelcome(next));
        };
        const entry: Welcome = { key, pins, shown: false, halo: !reduced() };
        show(entry);
        const box = pins.map((p) => p.box).reduce(union);
        await fly(r, fit(box, 0.3), TIMING.welcomeCamera, reduced());
        show({ ...entry, shown: true });
        void growPins(r, key);
        await r.sleep(TIMING.welcomeHold);
        show(null);
      }
      release(r);
    };

    const run = async () => {
      // Start outside the effect so flushSync is allowed.
      const start = spawn();
      await start.sleep(0);
      release(start);
      let round = 0;
      let countryReplays = 0;
      while (!stopped) {
        if (queueRef.current.length > 0) {
          await playWelcome();
          continue;
        }
        adopt();
        const settings = appliedRef.current;
        const now = current();

        if (settings.view.kind === "country") {
          if (now.edges.length === 0) {
            await attempt(playIdle);
            continue;
          }
          const thisRound = round;
          // An interrupted round replays from its beginning, at most once.
          const next = afterTourStep(
            await attempt((r) => playCountry(r, thisRound)),
            countryReplays,
          );
          countryReplays = next.replays;
          if (next.advance) round++;
          continue;
        }

        const plan = regionViewSteps(buildTour(now), settings.view.group);
        if (plan.length === 0) {
          await attempt(playIdle);
          continue;
        }
        for (let i = 0, replays = 0; i < plan.length && !stopped;) {
          const step = plan[i]!;
          if (queueRef.current.length > 0) {
            await playWelcome();
            continue;
          }
          // A new view or issue re-plans; speed, motion and bubbles apply in place.
          const before = appliedRef.current;
          adopt();
          if (!sameFilter(before, appliedRef.current)) break;
          // An interrupted step replays from its beginning, at most once.
          const next = afterTourStep(await attempt((r) => playStep(r, step)), replays);
          replays = next.replays;
          if (next.advance) i++;
        }
      }
    };
    void run();
    return () => {
      stopped = true;
      live.forEach((r) => r.cancel());
    };
  }, [motion.ready, applyView]);

  const emptyNote = useMemo(() => {
    if (!empty) return null;
    const { stats } = buildPeopleNetwork(users, connections);
    return stats.plottedConnections > 0
      ? `เส้นเชื่อม ${stats.plottedConnections} คู่ · คนบนแผนที่ ${stats.locatedPeople} คน`
      : stats.locatedPeople > 0
        ? `คนบนแผนที่ ${stats.locatedPeople} คน — เมื่อแมตช์กันแล้วเส้นเชื่อมจะโผล่เอง`
        : "ยังไม่มีตำแหน่งจังหวัดให้วางบนแผนที่";
  }, [empty, users, connections]);

  /** Centred on the map when the chosen view or issue has no pairs (never a blank map). */
  const viewNote = useMemo(() => {
    if (!viewEmpty) return null;
    const where = applied.view.kind === "region" ? `ใน${GROUP_LABEL[applied.view.group]}` : "";
    const issue = applied.issue === null ? "" : ` ประเด็น ${issueTh(applied.issue)}`;
    return `ยังไม่มีคู่เชื่อม${where}${issue}`;
  }, [viewEmpty, applied.view, applied.issue]);

  /** Provinces holding a welcome pin stay lit; the rest dim. */
  const welcomeProvinces = useMemo(
    () => new Set(welcome?.pins.filter((p) => !p.hub).map((p) => p.placeLabel)),
    [welcome],
  );

  const shade = scene.shade;
  const sceneEdges: { id: string; animate: boolean; key: string }[] =
    scene.edges === "all"
      ? layout.edges.map((e) => ({ id: e.id, animate: false, key: `0:${e.id}` }))
      : scene.edges.map((e) => ({ ...e, key: `${scene.key}:${e.id}` }));
  const cardFrom = scene.card ? layout.nodesById.get(scene.card.fromId) : undefined;
  const cardTo = scene.card ? layout.nodesById.get(scene.card.toId) : undefined;
  const cardEdge = scene.card ? edgesById.get(scene.card.edgeId) : undefined;
  /** While a welcome plays, the tour's own lines and dots step back. */
  const tourLayer = {
    opacity: welcome ? 0.15 : 1,
  };
  const welcomeShown = welcome?.shown ? welcome : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={FULL_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full"
          role="img"
          aria-label="แผนที่ประเทศไทยแสดงคู่เชื่อมของผู้เข้าร่วม วนดูทีละภาค"
        >
          <g aria-hidden="true">
            {PROVINCES.map((province) => {
              const group = PROVINCE_GROUP[province.region];
              const opacity = welcome
                ? welcomeProvinces.has(province.th)
                  ? 0.38
                  : 0.07
                : shade === null
                  ? 0.22
                  : group && shade.includes(group)
                    ? 0.38
                    : 0.07;
              return (
                <path
                  key={province.en}
                  d={province.d}
                  data-region={province.region}
                  fill={REGION_FILL[province.region]}
                  stroke="var(--color-background)"
                  strokeWidth={1.6}
                  vectorEffect="non-scaling-stroke"
                  className="live-map-province motion-safe:transition-[fill-opacity] motion-safe:duration-600"
                  style={{ fillOpacity: opacity }}
                />
              );
            })}
          </g>
          <g
            id="edges"
            aria-hidden="true"
            className="motion-safe:transition-opacity motion-safe:duration-600"
            style={tourLayer}
          >
            {sceneEdges.map((edge, index) => {
              const data = edgesById.get(edge.id);
              if (!data) return null;
              return (
                <path
                  key={edge.key}
                  data-edge={edge.key}
                  d={data.path}
                  fill="none"
                  stroke={colors.edges[index % colors.edges.length]}
                  strokeWidth={PX.line / DEFAULT_SCALE}
                  strokeOpacity={0.9}
                  strokeLinecap="round"
                  pathLength={1}
                  style={edge.animate ? { strokeDasharray: "1 2", strokeDashoffset: 1 } : undefined}
                />
              );
            })}
          </g>
          <g
            aria-hidden="true"
            className="motion-safe:transition-opacity motion-safe:duration-600"
            style={tourLayer}
          >
            {layout.nodes.map((node) => (
              <MapNode
                key={node.id}
                node={node}
                visible={scene.visible === "all" || scene.visible.has(node.id)}
                labelled={scene.labelled.has(node.id)}
                colors={colors}
              />
            ))}
          </g>
          {scene.bubbles.length > 0 && (
            <g
              aria-hidden="true"
              className="motion-safe:transition-opacity motion-safe:duration-600"
              style={tourLayer}
            >
              {scene.bubbles.map((id) => {
                const edge = edgesById.get(id);
                const a = edge && layout.nodesById.get(edge.sourceId);
                const b = edge && layout.nodesById.get(edge.targetId);
                const mid = edge && pathMidpoint(edge, layout);
                if (!a || !b || !mid) return null;
                const index = sceneEdges.findIndex((e) => e.id === id);
                return (
                  <PairBubble
                    key={`${scene.key}:${id}`}
                    x={mid.x}
                    y={mid.y}
                    from={a}
                    to={b}
                    accent={colors.edges[Math.max(0, index) % colors.edges.length]!}
                    colors={colors}
                  />
                );
              })}
            </g>
          )}
          {welcomeShown && (
            <g aria-hidden="true">
              {welcomeShown.pins.map((pin) => (
                <WelcomePinMark
                  key={`${welcomeShown.key}:${pin.id}`}
                  welcomeKey={welcomeShown.key}
                  pin={pin}
                  halo={welcomeShown.halo}
                />
              ))}
            </g>
          )}
        </svg>

        {scene.chip && !welcome && (
          <div className="live-map-chip pointer-events-none absolute top-3 left-3 max-w-[80%] rounded-2xl bg-white/90 px-4 py-2 shadow-sm">
            <p className="live-map-chip-title font-heading text-[clamp(1rem,1.7vw,1.6rem)] leading-tight font-bold text-ink">
              {scene.chip.title}
            </p>
            {scene.chip.meta && (
              <p className="text-[clamp(0.8rem,1.1vw,1.1rem)] leading-snug text-ink-soft">
                {scene.chip.meta}
              </p>
            )}
          </div>
        )}

        {!welcome && cardFrom && cardTo && cardEdge && (
          <div className="live-map-card pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border-2 border-primary bg-white/95 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 text-[clamp(0.95rem,1.5vw,1.5rem)] leading-tight">
              <Who node={cardFrom} />
              <span aria-hidden="true" className="shrink-0 font-bold text-primary">
                ⟷
              </span>
              <Who node={cardTo} />
            </div>
            {cardEdge.sharedInterests.length > 0 && (
              <p className="mt-1 text-[clamp(0.8rem,1.1vw,1.1rem)] leading-snug text-ink-soft">
                เชื่อมกันเรื่อง: {cardEdge.sharedInterests.map(issueTh).join(" · ")}
              </p>
            )}
          </div>
        )}

        {viewNote && !welcome && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <p
              role="status"
              className="live-map-card rounded-2xl bg-white/95 px-5 py-3 text-center font-heading text-[clamp(1.1rem,1.9vw,1.9rem)] leading-tight font-bold text-ink shadow-sm"
            >
              {viewNote}
            </p>
          </div>
        )}

        {welcomeShown && <WelcomeCard pins={welcomeShown.pins} />}
      </div>
      {emptyNote && (
        <p className="shrink-0 pt-2 text-center text-body text-ink-soft">{emptyNote}</p>
      )}
    </div>
  );
}

function WelcomeCard({ pins }: { pins: WelcomePin[] }) {
  const named = pins.slice(0, WELCOME_NAMES);
  const more = pins.length - named.length;
  return (
    <div
      role="status"
      className="live-map-card pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border-2 bg-white/95 px-4 py-3 shadow-sm"
      style={{ borderColor: PIN_COLOR }}
    >
      <p
        className="font-heading text-[clamp(1.1rem,1.9vw,1.9rem)] leading-tight font-bold"
        style={{ color: PIN_COLOR }}
      >
        ยินดีต้อนรับ
      </p>
      <div className="mt-1 flex items-center gap-4 text-[clamp(0.95rem,1.5vw,1.5rem)] leading-tight">
        {named.map((pin) => (
          <span key={pin.id} className="flex min-w-0 flex-1 flex-col">
            <b className="truncate font-bold text-ink">{pin.name}</b>
            <small className="truncate text-[0.75em] text-ink-soft">{pin.placeLabel}</small>
          </span>
        ))}
        {more > 0 && <span className="shrink-0 text-ink-soft">และอีก {more} คน</span>}
      </div>
    </div>
  );
}

function WelcomePinMark({
  welcomeKey,
  pin,
  halo,
}: {
  welcomeKey: number;
  pin: WelcomePin;
  halo: boolean;
}) {
  // Children are in on-screen px: the group is counter-scaled by applyView().
  // growPins() animates the dot's scale and the halo from these start values.
  return (
    <g
      data-node=""
      data-welcome={welcomeKey}
      data-x={pin.x}
      data-y={pin.y}
      transform={`translate(${pin.x} ${pin.y}) scale(${1 / DEFAULT_SCALE})`}
    >
      {halo && (
        <circle
          data-welcome-halo=""
          r={PX.pin}
          fill="none"
          stroke={PIN_COLOR}
          strokeWidth={PX.pinHaloStroke}
          opacity={0}
        />
      )}
      <g data-welcome-dot="" transform="scale(0)">
        <circle r={PX.pin} fill={PIN_COLOR} stroke={PIN_RING} strokeWidth={PX.pinRing} />
      </g>
    </g>
  );
}

/**
 * A pair's name bubble at its line's midpoint: both names and both places,
 * about twice the size of the small labels. Children are in on-screen px: the
 * group is counter-scaled by applyView().
 */
function PairBubble({
  x,
  y,
  from,
  to,
  accent,
  colors,
}: {
  x: number;
  y: number;
  from: LiveMapNode;
  to: LiveMapNode;
  accent: string;
  colors: LookColors;
}) {
  const side = (node: LiveMapNode) => (
    <span style={{ display: "flex", flexDirection: "column", minWidth: 0, maxWidth: 300 }}>
      <b
        style={{
          fontSize: PX.bubbleName,
          fontWeight: 700,
          lineHeight: 1.15,
          color: colors.name,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {node.name}
      </b>
      <small
        style={{
          fontSize: PX.bubblePlace,
          lineHeight: 1.2,
          color: colors.place,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {node.placeLabel}
      </small>
    </span>
  );
  return (
    <g
      data-node=""
      data-bubble=""
      data-x={x}
      data-y={y}
      transform={`translate(${x} ${y}) scale(${1 / DEFAULT_SCALE})`}
    >
      <foreignObject
        x={-PX.bubbleBoxW / 2}
        y={-PX.bubbleBoxH / 2}
        width={PX.bubbleBoxW}
        height={PX.bubbleBoxH}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="live-map-bubble"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              maxWidth: "100%",
              padding: "10px 20px",
              borderRadius: 28,
              background: "#ffffff",
              border: `3px solid ${accent}`,
              boxShadow: "0 4px 14px rgba(43, 40, 120, 0.18)",
            }}
          >
            {side(from)}
            <span
              aria-hidden="true"
              style={{ fontSize: PX.bubbleName, fontWeight: 700, color: accent }}
            >
              ⟷
            </span>
            {side(to)}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

function Who({ node }: { node: LiveMapNode }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <b className="truncate font-bold text-ink">{node.name}</b>
      <small className="truncate text-[0.75em] text-ink-soft">{node.placeLabel}</small>
    </span>
  );
}

function MapNode({
  node,
  visible,
  labelled,
  colors,
}: {
  node: LiveMapNode;
  visible: boolean;
  labelled: boolean;
  colors: LookColors;
}) {
  // Children are in on-screen px: the group is counter-scaled by applyView().
  const fill =
    node.kind === "province"
      ? "var(--color-primary)"
      : node.kind === "hub"
        ? "var(--color-ink)"
        : "var(--color-paper)";
  const stroke = node.kind === "region" ? "var(--color-primary)" : "var(--color-paper)";
  const halo = {
    paintOrder: "stroke",
    stroke: colors.halo,
    strokeWidth: PX.halo,
    strokeLinejoin: "round",
  } as const;
  return (
    <g
      data-node=""
      data-x={node.x}
      data-y={node.y}
      transform={`translate(${node.x} ${node.y}) scale(${1 / DEFAULT_SCALE})`}
      className="motion-safe:transition-opacity motion-safe:duration-500"
      style={{ opacity: visible ? 1 : 0.18 }}
    >
      <circle
        r={node.kind === "region" ? PX.regionDot : PX.dot}
        fill={fill}
        stroke={stroke}
        strokeWidth={PX.dotStroke}
      />
      {labelled && (
        <>
          <text
            x={PX.labelX}
            y={-1}
            fontSize={PX.name}
            fontWeight={700}
            fill={colors.name}
            style={halo}
          >
            {node.name}
          </text>
          <text x={PX.labelX} y={14} fontSize={PX.place} fill={colors.place} style={halo}>
            {node.placeLabel}
          </text>
        </>
      )}
    </g>
  );
}

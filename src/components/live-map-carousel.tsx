import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { LiveThailandMap } from "@/components/live-thailand-map";
import { issueTh } from "@/lib/i18n";
import {
  buildLiveMapLayout,
  groupBox,
  type LiveMapLayout,
  type LiveMapNode,
  type TourGroupKey,
} from "@/lib/live-map-layout";
import { buildTour, GROUP_LABEL, type TourStep } from "@/lib/live-map-tour";
import { useMotionSettings } from "@/lib/motion";
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

const PROVINCE_GROUP: Partial<Record<Region, TourGroupKey>> = {
  North: "north",
  Northeast: "northeast",
  Central: "central",
  Bangkok: "central",
  South: "south",
};

/** Timings (ms). Camera and line drawing drop to 0 with reduced motion / low spec. */
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
  /** How often an empty map checks for new pairs. */
  idleRecheck: 2000,
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
};

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
};

const INITIAL_SCENE: Scene = {
  key: 0,
  shade: null,
  visible: "all",
  labelled: new Set(),
  edges: "all",
  chip: null,
  card: null,
};

type Latest = { layout: LiveMapLayout; tour: TourStep[] };

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
 * The big-screen map as a calm tour: region by region, the camera eases in, the
 * region's people appear as dots, and its pairs draw one at a time, each pair's
 * two people gaining their name and place as it draws (at most MAX_LABELS
 * labels at once); then up to two cross-region pairs, labelling just that pair;
 * then the whole country. Re-plans from the latest data at the start of every
 * loop.
 */
export function LiveMapCarousel({
  users,
  connections,
}: {
  users: User[];
  connections: Connection[];
}) {
  const layout = useMemo(() => buildLiveMapLayout(users, connections), [users, connections]);
  const tour = useMemo(() => buildTour(layout), [layout]);
  const edgesById = useMemo(() => new Map(layout.edges.map((e) => [e.id, e])), [layout]);

  const latestRef = useRef<Latest>({ layout, tour });
  useEffect(() => {
    latestRef.current = { layout, tour };
  }, [layout, tour]);

  const motion = useMotionSettings();
  const motionRef = useRef(motion);
  useEffect(() => {
    motionRef.current = motion;
  }, [motion]);

  const [scene, setScene] = useState<Scene>(INITIAL_SCENE);
  const svgRef = useRef<SVGSVGElement>(null);
  const vbRef = useRef<ViewBox>(FULL);

  const empty = tour.length === 0;

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

  // After every commit (new nodes/edges, or the svg remounting after an empty spell).
  useLayoutEffect(() => {
    applyView();
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => applyView());
    observer.observe(svg);
    return () => observer.disconnect();
  }, [applyView, empty]);

  // ---- Tour runner ------------------------------------------------------------

  useEffect(() => {
    if (!motion.ready) return;
    const runner = createRunner();
    let seq = 0;

    const reduced = () => motionRef.current.reducedMotion || motionRef.current.lowSpec;

    const commit = (update: (prev: Scene) => Scene) => {
      if (runner.cancelled) return;
      flushSync(() => setScene(update));
    };

    const fly = async (to: ViewBox, ms: number) => {
      const from = { ...vbRef.current };
      const duration = reduced() ? 0 : ms;
      await tween(runner, duration, (elapsed) => {
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
    const draw = async (key: number, ids: string[], ms: number, gap = 0) => {
      const svg = svgRef.current;
      if (!svg || ids.length === 0) return;
      const paths = ids
        .map((id) => svg.querySelector<SVGPathElement>(`[data-edge="${key}:${CSS.escape(id)}"]`))
        .filter((p): p is SVGPathElement => p !== null);
      const duration = reduced() ? 0 : ms;
      await tween(runner, duration, (elapsed) => {
        let done = true;
        paths.forEach((path, i) => {
          const k = duration > 0 ? Math.min(1, Math.max(0, (elapsed - i * gap) / duration)) : 1;
          if (k < 1) done = false;
          path.style.strokeDashoffset = String(1 - easeOutCubic(k));
        });
        return done;
      });
    };

    /** Add a pair to the scene; with `label`, show names for the pairs drawn so far. */
    const addEdge = (id: string, label = false) =>
      commit((prev) => {
        if (prev.edges === "all" || prev.edges.some((e) => e.id === id)) return prev;
        const edges = [...prev.edges, { id, animate: !reduced() }];
        const labelled = label
          ? pairLabels(
              latestRef.current.layout,
              edges.map((e) => e.id),
            )
          : prev.labelled;
        return { ...prev, edges, labelled };
      });

    type RegionContext = {
      group: TourGroupKey;
      key: number;
      members: string[];
      partners: string[];
      meta: string;
    };
    let region: RegionContext | null = null;

    const regionContext = (group: TourGroupKey, nodeIds: string[], meta: string): RegionContext => {
      const { layout: now } = latestRef.current;
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

    const playRegion = async (step: Extract<TourStep, { kind: "region" }>) => {
      const { layout: now } = latestRef.current;
      const ctx = regionContext(
        step.group,
        step.nodeIds,
        `${step.intraCount} คู่ในภาค · ${step.crossCount} คู่ข้ามภาค`,
      );
      const edgeIds = step.edgeIds.filter((id) => now.edges.some((e) => e.id === id));
      if (ctx.members.length === 0 && edgeIds.length === 0) return;
      region = ctx;
      commit(() => ({
        key: ctx.key,
        shade: [ctx.group],
        visible: new Set([...ctx.members, ...ctx.partners]),
        // Names appear only as each pair draws, so a busy region stays readable.
        labelled: new Set(),
        edges: [],
        chip: { title: GROUP_LABEL[ctx.group], meta: ctx.meta },
        card: null,
      }));
      await fly(fit(groupBox(ctx.group), 0.14), TIMING.camera);
      for (const id of edgeIds) {
        if (runner.cancelled) return;
        if (!latestRef.current.layout.edges.some((e) => e.id === id)) continue;
        addEdge(id, true);
        await draw(ctx.key, [id], TIMING.draw);
      }
      await runner.sleep(TIMING.regionHold);
    };

    const playCross = async (step: Extract<TourStep, { kind: "cross" }>) => {
      const { layout: now } = latestRef.current;
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
      commit((prev) => ({
        key: ctx.key,
        shade: toGroup ? [ctx.group, toGroup] : [ctx.group],
        visible: new Set([...ctx.members, ...ctx.partners, from.id, to.id]),
        labelled: new Set([from.id, to.id]),
        edges: fresh || prev.edges === "all" ? [] : prev.edges,
        chip: {
          title: `${GROUP_LABEL[ctx.group]} → ${toGroup ? GROUP_LABEL[toGroup] : "ทั่วประเทศ"}`,
          meta: ctx.meta,
        },
        card: { fromId: from.id, toId: to.id, edgeId: step.edgeId },
      }));
      await fly(fit(union(from.box, to.box), 0.3), TIMING.crossCamera);
      if (runner.cancelled) return;
      addEdge(step.edgeId);
      await draw(ctx.key, [step.edgeId], TIMING.draw);
      await runner.sleep(TIMING.crossHold);
    };

    const playOverview = async (step: Extract<TourStep, { kind: "overview" }>) => {
      const { layout: now } = latestRef.current;
      const present = new Set(now.edges.map((e) => e.id));
      const edgeIds = step.edgeIds.filter((id) => present.has(id));
      region = null;
      const key = ++seq;
      const animate = !reduced();
      commit(() => ({
        key,
        shade: null,
        visible: "all",
        labelled: new Set(),
        edges: [],
        chip: {
          title: "ทั่วประเทศ",
          meta: `เส้นบนแผนที่ ${edgeIds.length} คู่ · ข้ามภาค ${crossTotal(now)} คู่`,
        },
        card: null,
      }));
      await fly(FULL, TIMING.camera);
      if (runner.cancelled) return;
      commit((prev) => ({ ...prev, edges: edgeIds.map((id) => ({ id, animate })) }));
      const gap = Math.min(TIMING.overviewGap, TIMING.overviewSpread / Math.max(1, edgeIds.length));
      // Drawing runs inside the hold, as in the approved mockup.
      void draw(key, edgeIds, TIMING.draw, gap);
      await runner.sleep(TIMING.overviewHold);
    };

    const run = async () => {
      // Start outside the effect so flushSync is allowed.
      await runner.sleep(0);
      while (!runner.cancelled) {
        const plan = latestRef.current.tour;
        if (plan.length === 0) {
          region = null;
          await runner.sleep(TIMING.idleRecheck);
          continue;
        }
        for (const step of plan) {
          if (runner.cancelled) return;
          if (step.kind === "region") await playRegion(step);
          else if (step.kind === "cross") await playCross(step);
          else await playOverview(step);
        }
      }
    };
    void run();
    return () => runner.cancel();
  }, [motion.ready, applyView]);

  if (empty) return <LiveThailandMap users={users} connections={connections} />;

  const shade = scene.shade;
  const sceneEdges: { id: string; animate: boolean; key: string }[] =
    scene.edges === "all"
      ? layout.edges.map((e) => ({ id: e.id, animate: false, key: `0:${e.id}` }))
      : scene.edges.map((e) => ({ ...e, key: `${scene.key}:${e.id}` }));
  const cardFrom = scene.card ? layout.nodesById.get(scene.card.fromId) : undefined;
  const cardTo = scene.card ? layout.nodesById.get(scene.card.toId) : undefined;
  const cardEdge = scene.card ? edgesById.get(scene.card.edgeId) : undefined;

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
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
            const opacity = shade === null ? 0.22 : group && shade.includes(group) ? 0.38 : 0.07;
            return (
              <path
                key={province.en}
                d={province.d}
                fill={REGION_FILL[province.region]}
                stroke="var(--color-background)"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
                className="motion-safe:transition-[fill-opacity] motion-safe:duration-600"
                style={{ fillOpacity: opacity }}
              />
            );
          })}
        </g>
        <g id="edges" aria-hidden="true">
          {sceneEdges.map((edge, index) => {
            const data = edgesById.get(edge.id);
            if (!data) return null;
            return (
              <path
                key={edge.key}
                data-edge={edge.key}
                d={data.path}
                fill="none"
                stroke={EDGE_COLORS[index % EDGE_COLORS.length]}
                strokeWidth={PX.line / DEFAULT_SCALE}
                strokeOpacity={0.9}
                strokeLinecap="round"
                pathLength={1}
                style={edge.animate ? { strokeDasharray: "1 2", strokeDashoffset: 1 } : undefined}
              />
            );
          })}
        </g>
        <g aria-hidden="true">
          {layout.nodes.map((node) => (
            <MapNode
              key={node.id}
              node={node}
              visible={scene.visible === "all" || scene.visible.has(node.id)}
              labelled={scene.labelled.has(node.id)}
            />
          ))}
        </g>
      </svg>

      {scene.chip && (
        <div className="pointer-events-none absolute top-3 left-3 max-w-[80%] rounded-2xl bg-white/90 px-4 py-2 shadow-sm">
          <p className="font-heading text-[clamp(1rem,1.7vw,1.6rem)] leading-tight font-bold text-ink">
            {scene.chip.title}
          </p>
          {scene.chip.meta && (
            <p className="text-[clamp(0.8rem,1.1vw,1.1rem)] leading-snug text-ink-soft">
              {scene.chip.meta}
            </p>
          )}
        </div>
      )}

      {cardFrom && cardTo && cardEdge && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border-2 border-primary bg-white/95 px-4 py-3 shadow-sm">
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
    </div>
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
}: {
  node: LiveMapNode;
  visible: boolean;
  labelled: boolean;
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
    stroke: "var(--color-paper)",
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
            fill="var(--color-ink)"
            style={halo}
          >
            {node.name}
          </text>
          <text x={PX.labelX} y={14} fontSize={PX.place} fill="var(--color-ink-soft)" style={halo}>
            {node.placeLabel}
          </text>
        </>
      )}
    </g>
  );
}

import { useMemo, type ReactNode } from "react";

import { useMotionSettings } from "@/lib/motion";
import { MAP_VIEWBOX, PROVINCE_BY_TH, PROVINCES, PROVINCES_BY_REGION } from "@/lib/thailand-geo";
import type { Connection, User } from "@/lib/types";

type Node = { x: number; y: number; r: number; d: number; c: string };

const COLORS = ["var(--primary)", "var(--electric)", "var(--coral)", "var(--lime)"];

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function NetworkBackground({
  count = 22,
  className = "",
  seed = 7,
}: {
  count?: number;
  className?: string;
  seed?: number;
}) {
  const { nodes, links } = useMemo(() => {
    const r = rand(seed);
    const nodes: Node[] = Array.from({ length: count }, (_, i) => ({
      x: 6 + r() * 88,
      y: 5 + r() * 90,
      r: 0.5 + r() * 1.1,
      d: r() * 3,
      c: COLORS[i % COLORS.length]!,
    }));
    const links: [Node, Node, number][] = [];
    nodes.forEach((n, i) => {
      const m = nodes[(i + 3 + Math.floor(r() * 4)) % nodes.length]!;
      const dist = Math.hypot(n.x - m.x, n.y - m.y);
      if (dist < 45) links.push([n, m, r() * 2]);
    });
    return { nodes, links };
  }, [count, seed]);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {links.map(([a, b, d], i) => (
        <line
          key={i}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="currentColor"
          strokeWidth={0.18}
          opacity={0.25}
          strokeDasharray="200"
          className="animate-draw"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill={n.c}
          className="animate-pulse-node"
          style={{ animationDelay: `${n.d}s`, transformOrigin: `${n.x}px ${n.y}px` }}
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* LiveNetwork — แผนที่เครือข่ายจริง: จุด = คนที่เชื่อมแล้ว เส้น = คู่เชื่อม  */
/* ------------------------------------------------------------------ */

function hashId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function placeUser(u: User): { x: number; y: number } {
  const p =
    PROVINCE_BY_TH[u.province] ??
    PROVINCES.find((s) => s.en === u.province) ??
    PROVINCES_BY_REGION(u.region)[0] ??
    PROVINCE_BY_TH["กรุงเทพมหานคร"] ??
    PROVINCES[0]!;
  const h = hashId(u.id);
  const jx = ((h & 0xff) / 255) * 24 - 12;
  const jy = (((h >>> 8) & 0xff) / 255) * 24 - 12;
  return { x: p.cx + jx, y: p.cy + jy };
}

/**
 * เครือข่ายสดบนแผนที่ประเทศไทย — วาดจากข้อมูลคู่เชื่อมจริงในสโตร์
 * เส้นใหม่จะค่อย ๆ วาดขึ้นเมื่อมีคนเชื่อมกันเพิ่ม (key คงที่ → เล่นแอนิเมชันเฉพาะเส้นใหม่)
 */
export function LiveNetwork({
  users,
  connections,
  className = "",
  emptyAction,
}: {
  users: User[];
  connections: Connection[];
  className?: string;
  emptyAction?: ReactNode;
}) {
  const { reducedMotion, lowSpec } = useMotionSettings();
  const animate = !reducedMotion && !lowSpec;

  const { nodes, edges, newestId, regionCount } = useMemo(() => {
    const userById = new Map(users.map((u) => [u.id, u]));
    const valid = connections.filter((c) => userById.has(c.user_a) && userById.has(c.user_b));
    const sorted = [...valid].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
    // เก็บคนที่อยู่ในคู่เชื่อมล่าสุด ไม่เกิน 60 คน
    const kept = new Set<string>();
    for (const c of sorted) {
      if (kept.size >= 60) break;
      kept.add(c.user_a);
      if (kept.size < 60) kept.add(c.user_b);
    }
    const edges = sorted.filter((c) => kept.has(c.user_a) && kept.has(c.user_b));
    const nodes = new Map<string, { x: number; y: number }>();
    const regions = new Set<string>();
    kept.forEach((id) => {
      const u = userById.get(id)!;
      nodes.set(id, placeUser(u));
      regions.add(u.region);
    });
    return { nodes, edges, newestId: edges[0]?.id ?? null, regionCount: regions.size };
  }, [users, connections]);

  if (edges.length === 0) {
    return (
      <div
        className={`grid place-items-center rounded-2xl bg-sky-soft p-6 text-center ${className}`}
      >
        <div>
          <p className="text-body font-semibold text-ink">
            ยังไม่มีคู่เชื่อม — ลองชวนคนแรกคุยกันเลย
          </p>
          <p lang="en" className="mt-1 text-body text-ink-soft">
            No connections yet — start the first one
          </p>
          {emptyAction && <div className="mt-3">{emptyAction}</div>}
        </div>
      </div>
    );
  }

  const newest = edges.find((e) => e.id === newestId);
  const newestEnds = new Set(newest ? [newest.user_a, newest.user_b] : []);
  // วาดเส้นใหม่สุดทีหลังให้อยู่ด้านบน
  const ordered = [...edges].reverse();

  return (
    <svg
      role="img"
      aria-label={`เครือข่ายคู่เชื่อม ${edges.length} คู่ จาก ${regionCount} ภาค · ${edges.length} connections across ${regionCount} regions`}
      viewBox={MAP_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      className={`h-full w-full ${className}`}
    >
      <g className="text-muted-foreground" aria-hidden="true">
        {PROVINCES.map((p) => (
          <path
            key={p.en}
            d={p.d}
            fill="currentColor"
            fillOpacity={0.12}
            stroke="currentColor"
            strokeOpacity={0.25}
            strokeWidth={1}
          />
        ))}
      </g>
      <g aria-hidden="true">
        {ordered.map((c) => {
          const a = nodes.get(c.user_a);
          const b = nodes.get(c.user_b);
          if (!a || !b) return null;
          const isNew = c.id === newestId;
          return (
            <line
              key={c.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              pathLength={200}
              strokeDasharray={200}
              stroke="var(--primary)"
              strokeWidth={isNew ? 8 : 4}
              strokeOpacity={isNew ? 1 : 0.55}
              strokeLinecap="round"
              className={animate ? "animate-draw" : undefined}
            />
          );
        })}
        {[...nodes.entries()].map(([id, n]) => {
          const ring = newestEnds.has(id);
          return (
            <g key={id}>
              {ring && (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={28}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={4}
                  className={animate ? "animate-pulse-node" : undefined}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              )}
              <circle cx={n.x} cy={n.y} r={ring ? 16 : 10} fill="var(--primary)" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

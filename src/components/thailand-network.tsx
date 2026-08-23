import { useMemo } from "react";

import { MAP_VIEWBOX, PROVINCES } from "@/lib/thailand-geo";

const COLORS = ["var(--primary)", "var(--electric)", "var(--coral)", "var(--lime)"];

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Thailand silhouette with pulsing "people" dots connected by dashed lines.
 * Uses preserveAspectRatio="xMidYMid meet" so dots stay perfectly circular.
 */
export function ThailandNetwork({
  count = 18,
  className = "",
  seed = 11,
}: {
  count?: number;
  className?: string;
  seed?: number;
}) {
  const { nodes, links } = useMemo(() => {
    const r = rand(seed);
    const pool = [...PROVINCES];
    const picked: { x: number; y: number; c: string; d: number; rr: number }[] = [];
    for (let i = 0; i < count && pool.length; i++) {
      const idx = Math.floor(r() * pool.length);
      const p = pool.splice(idx, 1)[0]!;
      picked.push({
        x: p.cx,
        y: p.cy,
        c: COLORS[i % COLORS.length]!,
        d: r() * 3,
        rr: 7 + r() * 7,
      });
    }
    const links: [number, number, number][] = [];
    picked.forEach((n, i) => {
      let best = -1;
      let bestDist = Infinity;
      picked.forEach((m, j) => {
        if (j === i) return;
        const dist = Math.hypot(n.x - m.x, n.y - m.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = j;
        }
      });
      if (best > i) links.push([i, best, r() * 2.5]);
      const far = picked[(i + 5) % picked.length]!;
      if (Math.hypot(n.x - far.x, n.y - far.y) < 700 && i % 3 === 0) {
        links.push([i, (i + 5) % picked.length, r() * 2.5]);
      }
    });
    return { nodes: picked, links };
  }, [count, seed]);

  return (
    <svg
      aria-hidden="true"
      viewBox={MAP_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <g opacity={0.22}>
        {PROVINCES.map((p) => (
          <path
            key={p.en}
            d={p.d}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1}
            fillOpacity={0.12}
            strokeOpacity={0.45}
          />
        ))}
      </g>

      {links.map(([a, b, delay], i) => {
        const n = nodes[a]!;
        const m = nodes[b]!;
        return (
          <line
            key={i}
            x1={n.x}
            y1={n.y}
            x2={m.x}
            y2={m.y}
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeDasharray="10 14"
            opacity={0.5}
            className="animate-dash"
            style={{ animationDelay: `${delay}s` }}
          />
        );
      })}

      {nodes.map((n, i) => (
        <g key={i} style={{ transformOrigin: `${n.x}px ${n.y}px` }} className="animate-pulse-node">
          <circle cx={n.x} cy={n.y} r={n.rr * 2.4} fill={n.c} opacity={0.14} />
          <circle cx={n.x} cy={n.y} r={n.rr} fill={n.c} />
        </g>
      ))}
    </svg>
  );
}

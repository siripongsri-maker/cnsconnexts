import { useMemo } from "react";

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

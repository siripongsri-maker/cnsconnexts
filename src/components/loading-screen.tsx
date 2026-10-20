import { useEffect, useMemo, useState } from "react";
import { RotateCw } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

import { MAP_VIEWBOX, PROVINCES } from "@/lib/thailand-geo";
import { useMotionSettings } from "@/lib/motion";

const COLORS = ["#139bff", "#62bdff", "#a0d9ff", "#28649a"];

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const SLOW_AFTER_MS = 8000;

export function LoadingScreen({ message = "กำลังเชื่อม" }: { message?: string }) {
  const { reducedMotion, lowSpec } = useMotionSettings();
  const [dot, setDot] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, [reducedMotion]);

  // เน็ตช้าเกิน 8 วินาที → บอกให้รู้ และมีปุ่มลองใหม่ ไม่ปล่อยให้รอเงียบ ๆ
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div role="status" aria-live="polite" className="connexts-loading-screen">
      <div className="loading-screen-masthead">
        <Wordmark size="sm" />
        <span>NETWORK / CONNECTING</span>
      </div>
      <div className="loading-screen-frame">
        <div className="loading-map-stage" aria-hidden>
          <span className="loading-map-label">PEOPLE / IDEAS / ACTION</span>
          <div className="loading-map-art">
            <ThailandLoader
              reducedMotion={reducedMotion}
              lowSpec={lowSpec}
              className="text-primary"
            />
          </div>
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="loading-screen-copy">
          <p className="mission-kicker">CONNECTING POWER</p>
          <h2>
            {message}
            <span aria-hidden="true" className="loading-message-dots">
              {".".repeat(dot)}
            </span>
          </h2>
          <p>เชื่อมคน · เชื่อมไอเดีย · เชื่อมพื้นที่</p>
          <div className="loading-screen-signal" aria-hidden>
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className={index === dot ? "is-active" : ""} />
            ))}
          </div>
          {slow && (
            <div className="loading-slow-state">
              <p>ใช้เวลานานกว่าปกติ ลองโหลดอีกครั้งได้</p>
              <button type="button" onClick={() => window.location.reload()} className="tap">
                <RotateCw className="h-4 w-4" aria-hidden /> โหลดอีกครั้ง
              </button>
            </div>
          )}
        </div>
      </div>
      <span className="loading-screen-footer">ต่างพื้นที่ เชื่อมพลังเดียวกัน</span>
    </div>
  );
}

function ThailandLoader({
  reducedMotion = false,
  lowSpec = false,
  className = "",
}: {
  reducedMotion?: boolean;
  lowSpec?: boolean;
  className?: string;
}) {
  const count = lowSpec ? 8 : 14;
  const shouldAnimate = !reducedMotion && !lowSpec;

  const { nodes, links } = useMemo(() => {
    const r = rand(42);
    const pool = [...PROVINCES];
    const picked: { x: number; y: number; c: string; rr: number }[] = [];
    for (let i = 0; i < count && pool.length; i++) {
      const idx = Math.floor(r() * pool.length);
      const p = pool.splice(idx, 1)[0]!;
      picked.push({
        x: p.cx,
        y: p.cy,
        c: COLORS[i % COLORS.length]!,
        rr: 5 + r() * 6,
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
      const far = picked[(i + 4) % picked.length]!;
      if (Math.hypot(n.x - far.x, n.y - far.y) < 700 && i % 4 === 0) {
        links.push([i, (i + 4) % picked.length, r() * 2.5]);
      }
    });
    return { nodes: picked, links };
  }, [count]);

  return (
    <svg
      aria-hidden="true"
      viewBox={MAP_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      className={`h-full w-full ${className}`}
    >
      <g opacity={0.35}>
        {PROVINCES.map((p) => (
          <path
            key={p.en}
            d={p.d}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1}
            fillOpacity={0.12}
            strokeOpacity={0.35}
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
            strokeWidth={reducedMotion || lowSpec ? 1 : 1.8}
            strokeLinecap="round"
            strokeDasharray={reducedMotion || lowSpec ? "5 8" : "8 12"}
            opacity={reducedMotion || lowSpec ? 0.25 : 0.45}
            className={shouldAnimate ? "animate-dash" : undefined}
            style={shouldAnimate ? { animationDelay: `${delay}s` } : undefined}
          />
        );
      })}

      {nodes.map((n, i) => (
        <g
          key={i}
          style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          className={shouldAnimate ? "animate-pulse-node" : undefined}
          opacity={reducedMotion || lowSpec ? 0.8 : 1}
        >
          <circle cx={n.x} cy={n.y} r={n.rr * 2.2} fill={n.c} opacity={0.12} />
          <circle cx={n.x} cy={n.y} r={n.rr} fill={n.c} />
        </g>
      ))}
    </svg>
  );
}

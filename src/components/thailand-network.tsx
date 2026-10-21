import { useId, type CSSProperties, type RefObject } from "react";

import { MAP_VIEWBOX, PROVINCES } from "@/lib/thailand-geo";

const HUB_LAYOUT = [
  {
    province: "Bangkok Metropolis",
    label: "กรุงเทพฯ",
    labelX: -46,
    labelY: -34,
    anchor: "end",
    appear: 0,
  },
  {
    province: "Chiang Mai",
    label: "เชียงใหม่",
    labelX: 34,
    labelY: -28,
    anchor: "start",
    appear: 0.13,
  },
  {
    province: "Khon Kaen",
    label: "ขอนแก่น",
    labelX: 38,
    labelY: -22,
    anchor: "start",
    appear: 0.3,
  },
  { province: "Chon Buri", label: "ชลบุรี", labelX: 45, labelY: 48, anchor: "start", appear: 0.47 },
  { province: "Songkhla", label: "สงขลา", labelX: 38, labelY: -22, anchor: "start", appear: 0.63 },
] as const;

// Both outlines and node positions come from the project's actual province geometry.
const HUBS = HUB_LAYOUT.flatMap((layout) => {
  const shape = PROVINCES.find((province) => province.en === layout.province);
  return shape ? [{ ...layout, x: shape.cx, y: shape.cy, shape: shape.d }] : [];
});
const HUB_NAMES = new Set<string>(HUBS.map((hub) => hub.province));
const LAND = PROVINCES.map((province) => province.d).join(" ");

const CONNECTIONS = [
  { from: "Bangkok Metropolis", to: "Chiang Mai", bend: -80 },
  { from: "Bangkok Metropolis", to: "Khon Kaen", bend: 75 },
  { from: "Bangkok Metropolis", to: "Chon Buri", bend: -52 },
  { from: "Bangkok Metropolis", to: "Songkhla", bend: 140 },
  { from: "Chiang Mai", to: "Khon Kaen", bend: -95 },
  { from: "Chon Buri", to: "Songkhla", bend: -90 },
] as const;

const LINKS = CONNECTIONS.flatMap((connection) => {
  const from = HUBS.find((hub) => hub.province === connection.from);
  const to = HUBS.find((hub) => hub.province === connection.to);
  if (!from || !to) return [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const controlX = (from.x + to.x) / 2 - (dy / length) * connection.bend;
  const controlY = (from.y + to.y) / 2 + (dx / length) * connection.bend;
  return [
    {
      key: `${connection.from}-${connection.to}`,
      path: `M${from.x} ${from.y} Q${controlX.toFixed(2)} ${controlY.toFixed(2)} ${to.x} ${to.y}`,
    },
  ];
});

type ThailandNetworkProps = {
  /** Shared with the globe; inherited CSS values avoid a second animation loop. */
  progressRef?: RefObject<number>;
  disabled: boolean;
};

/** Decorative geographic chapter. Root owns --thailand-reveal and --network-progress. */
export function ThailandNetwork({ disabled }: ThailandNetworkProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <div className="thailand-network" data-disabled={disabled || undefined} aria-hidden="true">
      <svg
        className="thailand-network-map"
        viewBox={MAP_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <defs>
          <linearGradient
            id={`${id}-land`}
            x1="200"
            y1="0"
            x2="650"
            y2="1600"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#123c58" />
            <stop offset=".5" stopColor="#0c2a42" />
            <stop offset="1" stopColor="#071b2c" />
          </linearGradient>
          <linearGradient
            id={`${id}-link`}
            x1="220"
            y1="190"
            x2="510"
            y2="1470"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#49d2ff" />
            <stop offset=".46" stopColor="#9fe9ff" />
            <stop offset="1" stopColor="#139bff" />
          </linearGradient>
          <radialGradient id={`${id}-halo`}>
            <stop stopColor="#48caff" stopOpacity=".35" />
            <stop offset="1" stopColor="#139bff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="thailand-geography">
          <path
            d={LAND}
            fill={`url(#${id}-land)`}
            className="thailand-coast"
            vectorEffect="non-scaling-stroke"
          />
          {PROVINCES.map((province) => (
            <path
              key={province.en}
              d={province.d}
              fill={`url(#${id}-land)`}
              className={`thailand-province${HUB_NAMES.has(province.en) ? " thailand-province-hub" : ""}`}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        <g className="thailand-connections">
          {LINKS.map((link, index) => (
            <path
              key={link.key}
              d={link.path}
              pathLength={100}
              stroke={`url(#${id}-link)`}
              strokeDasharray="100 100"
              strokeDashoffset={0}
              className="thailand-network-link"
              vectorEffect="non-scaling-stroke"
              style={
                {
                  "--connection-start": index / LINKS.length,
                  "--connection-count": LINKS.length,
                } as CSSProperties
              }
            />
          ))}
        </g>
        <g className="thailand-hubs">
          {HUBS.map((hub) => (
            <g
              key={hub.province}
              className="thailand-hub"
              style={{ "--hub-start": hub.appear } as CSSProperties}
            >
              <circle cx={hub.x} cy={hub.y} r={40} fill={`url(#${id}-halo)`} />
              <circle
                cx={hub.x}
                cy={hub.y}
                r={14}
                className="thailand-hub-ring"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={hub.x} cy={hub.y} r={5.5} className="thailand-hub-point" />
              <path
                d={`M${hub.x} ${hub.y} l${hub.labelX * 0.68} ${hub.labelY * 0.68}`}
                className="thailand-label-leader"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={hub.x + hub.labelX}
                y={hub.y + hub.labelY}
                textAnchor={hub.anchor}
                className="thailand-hub-label"
              >
                {hub.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

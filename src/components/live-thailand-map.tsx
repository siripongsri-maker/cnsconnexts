import { useMemo } from "react";

import { MAP_VIEWBOX, PROVINCES } from "@/lib/thailand-geo";
import { buildPeopleNetwork } from "@/lib/people-network";
import type { Connection, Region, User } from "@/lib/types";

const REGION_FILL: Record<Region, string> = {
  North: "var(--color-block-purple)",
  Northeast: "var(--color-block-orange)",
  Central: "var(--color-block-blue)",
  Bangkok: "var(--color-ink)",
  South: "var(--color-block-green)",
  Nationwide: "var(--color-block-teal)",
};

type LiveThailandMapProps = {
  users: User[];
  connections: Connection[];
};

/**
 * แผนที่ประเทศไทยสำหรับจอใหญ่ — จุดคือผู้เข้าร่วมตามจังหวัด เส้นคือคู่ที่เชื่อมกันแล้ว
 * ตำแหน่งและเส้นมาจาก buildPeopleNetwork (จังหวัดจริง ไม่เดาที่อยู่) เหมือนหน้าแผนที่พลัง
 */
export function LiveThailandMap({ users, connections }: LiveThailandMapProps) {
  const network = useMemo(() => buildPeopleNetwork(users, connections), [users, connections]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    network.nodes.forEach((node) =>
      map.set(node.province.en, (map.get(node.province.en) ?? 0) + 1),
    );
    return map;
  }, [network]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <svg
        viewBox={MAP_VIEWBOX}
        className="h-full w-full"
        role="img"
        aria-label="แผนที่ประเทศไทยแสดงคู่เชื่อมของผู้เข้าร่วม"
      >
        {PROVINCES.map((province) => (
          <path
            key={province.en}
            d={province.d}
            fill={REGION_FILL[province.region]}
            fillOpacity={(counts.get(province.en) ?? 0) > 0 ? 0.34 : 0.08}
            stroke="var(--color-background)"
            strokeWidth={1.6}
            vectorEffect="non-scaling-stroke"
            aria-hidden="true"
          />
        ))}
        <g aria-hidden="true">
          {network.plottedEdges.map((edge, index) => (
            <path
              key={edge.id}
              d={edge.path ?? undefined}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={5}
              strokeOpacity={0.45}
              strokeLinecap="round"
              className="animate-dash"
              style={{ animationDelay: `${index * 0.35}s` }}
            />
          ))}
        </g>
        <g>
          {network.nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.degree > 0 ? 16 : 11}
                fill="var(--color-primary)"
                stroke="var(--color-background)"
                strokeWidth={3}
              />
              {node.degree > 1 && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={30}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={4}
                  className="animate-pulse-node"
                  style={{
                    transformOrigin: `${node.x}px ${node.y}px`,
                    transformBox: "view-box",
                  }}
                />
              )}
            </g>
          ))}
        </g>
      </svg>
      <p className="shrink-0 pt-2 text-center text-body text-ink-soft">
        {network.stats.plottedConnections > 0
          ? `เส้นเชื่อม ${network.stats.plottedConnections} คู่ · คนบนแผนที่ ${network.stats.locatedPeople} คน`
          : network.stats.locatedPeople > 0
            ? `คนบนแผนที่ ${network.stats.locatedPeople} คน — เมื่อแมตช์กันแล้วเส้นเชื่อมจะโผล่เอง`
            : "ยังไม่มีตำแหน่งจังหวัดให้วางบนแผนที่"}
      </p>
    </div>
  );
}

import type { TourGroupKey } from "./live-map-layout";

export type Speed = "slow" | "normal" | "fast";

export type ViewMode = { kind: "country" } | { kind: "region"; group: TourGroupKey };

export type LiveControlState = {
  speed: Speed;
  view: ViewMode;
  issue: string | null;
  motion: "moving" | "still";
  bubbles: boolean;
};

export const DEFAULT_CONTROL_STATE: LiveControlState = {
  speed: "normal",
  view: { kind: "country" },
  issue: null,
  motion: "moving",
  bubbles: true,
};

export const SPEED_FACTOR: Record<Speed, number> = {
  slow: 1.5,
  normal: 1,
  fast: 0.6,
};

export function scaleTiming(ms: number, speed: Speed): number {
  return Math.round(ms * SPEED_FACTOR[speed]);
}

export function edgeMatchesIssue(
  edge: { sourceId: string; targetId: string },
  issuesById: ReadonlyMap<string, readonly string[]>,
  issue: string | null,
): boolean {
  if (issue === null) return true;
  return (
    (issuesById.get(edge.sourceId)?.includes(issue) ?? false) ||
    (issuesById.get(edge.targetId)?.includes(issue) ?? false)
  );
}

export type DashboardFilters = {
  q: string;
  region: string;
  issue: string;
  power: string;
  powerMode: "any" | "have" | "need";
};

export type FilterPreset = {
  id: string;
  name: string;
  filters: DashboardFilters;
  created_at: string;
};

const KEY = "cns.dashboard.filter-presets";

export const emptyFilters: DashboardFilters = {
  q: "",
  region: "all",
  issue: "all",
  power: "all",
  powerMode: "any",
};

export function loadPresets(): FilterPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as FilterPreset[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function savePresets(list: FilterPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
}

export function sameFilters(a: DashboardFilters, b: DashboardFilters) {
  return (
    a.q.trim() === b.q.trim() &&
    a.region === b.region &&
    a.issue === b.issue &&
    a.power === b.power &&
    a.powerMode === b.powerMode
  );
}

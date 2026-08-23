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

/** ตรวจว่าโปรไฟล์ตรงกับชุดตัวกรองหรือไม่ (ใช้ทั้งแดชบอร์ดและการแจ้งเตือน) */
export function userMatchesFilters(
  u: {
    name: string;
    organization?: string;
    province?: string;
    bio?: string;
    region: string;
    interests: string[];
    powers_have: string[];
    powers_need: string[];
  } | undefined,
  f: DashboardFilters,
  label: { issueTh: (s: string) => string; powerTh: (s: string) => string },
): boolean {
  if (!u) return false;
  if (f.region !== "all" && u.region !== f.region) return false;
  if (f.issue !== "all" && !u.interests.includes(f.issue)) return false;
  if (f.power !== "all") {
    const inHave = u.powers_have.includes(f.power);
    const inNeed = u.powers_need.includes(f.power);
    const ok = f.powerMode === "have" ? inHave : f.powerMode === "need" ? inNeed : inHave || inNeed;
    if (!ok) return false;
  }
  const needle = f.q.trim().toLowerCase();
  if (needle) {
    const hay = [
      u.name,
      u.organization ?? "",
      u.province ?? "",
      u.bio ?? "",
      ...u.interests.map(label.issueTh),
      ...u.powers_have.map(label.powerTh),
      ...u.powers_need.map(label.powerTh),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

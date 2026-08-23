import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LiveTicker } from "@/components/live-ticker";
import { Activity, Bell, BellOff, BookmarkPlus, CheckCircle2, Handshake, Download, FileJson, Link2, Search, Share2, SlidersHorizontal, Sparkles, Users, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { NetworkBackground } from "@/components/network-background";
import { useStore, useUserMap } from "@/lib/store";
import { ISSUES, POWER_EMOJI, POWERS, REGIONS, type ConnectionStatus, type User } from "@/lib/types";
import { issueTh, powerTh, REGION_LABEL } from "@/lib/i18n";
import { downloadCSV, downloadJSON, type Row } from "@/lib/export";
import { rankMatches } from "@/lib/matching";
import {
  emptyFilters,
  loadPresets,
  savePresets,
  sameFilters,
  type DashboardFilters,
  type FilterPreset,
} from "@/lib/filter-presets";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  region: fallback(z.string(), "all").default("all"),
  issue: fallback(z.string(), "all").default("all"),
  power: fallback(z.string(), "all").default("all"),
  powerMode: fallback(z.enum(["any", "have", "need"]), "any").default("any"),
  view: fallback(z.enum(["organizer", "me"]), "organizer").default("organizer"),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "แดชบอร์ดสด — คนส. Connect" },
      {
        name: "description",
        content:
          "แดชบอร์ดสดสำหรับผู้จัดและผู้เข้าร่วม: ดูการแมตช์ การเชื่อมต่อ และความคืบหน้าคำมั่นสัญญาแบบเรียลไทม์",
      },
      { property: "og:title", content: "แดชบอร์ดสด — คนส. Connect" },
      {
        property: "og:description",
        content: "ตัวเลขสด ฟีดกิจกรรม และความคืบหน้าการลงมือทำของทั้งงาน",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const STATUS_TH: Record<ConnectionStatus, string> = {
  Connected: "เชื่อมแล้ว",
  Planning: "กำลังวางแผน",
  "In Progress": "กำลังทำ",
  Completed: "สำเร็จ",
};

const STATUS_ORDER: ConnectionStatus[] = ["Connected", "Planning", "In Progress", "Completed"];
const STATUS_TONE: Record<ConnectionStatus, "primary" | "electric" | "coral" | "lime"> = {
  Connected: "primary",
  Planning: "electric",
  "In Progress": "coral",
  Completed: "lime",
};

function useCountUp(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1000, 1);
      setN(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

function ago(iso: string, now: number) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

type Feed = {
  id: string;
  icon: "connect" | "commit";
  title: string;
  detail: string;
  created_at: string;
};

function Dashboard() {
  const { me, users, ideas, connections, commitments } = useStore();
  const userMap = useUserMap();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard" });
  const [view, setView] = useState<"organizer" | "me">(search.view);
  const [now, setNow] = useState(() => Date.now());

  // --- ฟิลเตอร์ขั้นสูง (ใช้ได้ทั้งมุมผู้จัดและมุมของฉัน) ---
  const [q, setQ] = useState(search.q);
  const [region, setRegion] = useState<string>(search.region);
  const [issue, setIssue] = useState<string>(search.issue);
  const [power, setPower] = useState<string>(search.power);
  const [powerMode, setPowerMode] = useState<"any" | "have" | "need">(search.powerMode);
  const [showFilters, setShowFilters] = useState(false);

  // --- ชุดตัวกรองที่บันทึกไว้ ---
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  useEffect(() => setPresets(loadPresets()), []);
  const currentFilters: DashboardFilters = { q, region, issue, power, powerMode };
  const activePresetId = presets.find((p) => sameFilters(p.filters, currentFilters))?.id ?? null;

  // --- sync filters + view to URL so the page is shareable ---
  useEffect(() => {
    const next = {
      q: q.trim() || undefined,
      region: region !== "all" ? region : undefined,
      issue: issue !== "all" ? issue : undefined,
      power: power !== "all" ? power : undefined,
      powerMode: powerMode !== "any" ? powerMode : undefined,
      view: view !== "organizer" ? view : undefined,
    };
    navigate({ search: next, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, region, issue, power, powerMode, view]);

  const describeFilters = (f: DashboardFilters) =>
    [
      f.q.trim() ? `"${f.q.trim()}"` : null,
      f.region !== "all" ? REGION_LABEL[f.region as keyof typeof REGION_LABEL] : null,
      f.issue !== "all" ? issueTh(f.issue) : null,
      f.power !== "all" ? powerTh(f.power) : null,
    ]
      .filter(Boolean)
      .join(" · ") || "ทั้งหมด";

  const applyPreset = (p: FilterPreset) => {
    setQ(p.filters.q);
    setRegion(p.filters.region);
    setIssue(p.filters.issue);
    setPower(p.filters.power);
    setPowerMode(p.filters.powerMode);
  };

  const persist = (list: FilterPreset[]) => {
    setPresets(list);
    savePresets(list);
  };

  const saveCurrentPreset = () => {
    const suggestion = describeFilters(currentFilters);
    const name = window.prompt("ตั้งชื่อชุดตัวกรอง", suggestion)?.trim();
    if (!name) return;
    const next: FilterPreset = {
      id: `fp_${Date.now()}`,
      name,
      filters: currentFilters,
      alerts: true,
      created_at: new Date().toISOString(),
    };
    persist([next, ...presets.filter((p) => p.name !== name)].slice(0, 12));
  };

  const removePreset = (id: string) => persist(presets.filter((p) => p.id !== id));

  const toggleAlerts = (id: string) =>
    persist(presets.map((p) => (p.id === id ? { ...p, alerts: !p.alerts } : p)));

  const activeCount =
    (q.trim() ? 1 : 0) +
    (region !== "all" ? 1 : 0) +
    (issue !== "all" ? 1 : 0) +
    (power !== "all" ? 1 : 0);
  const clearFilters = () => {
    setQ("");
    setRegion("all");
    setIssue("all");
    setPower("all");
    setPowerMode("any");
  };

  const shareCurrentUrl = async () => {
    const url = window.location.href;
    const title = view === "me" ? "มุมของฉัน — คนส. Connect" : "แดชบอร์ดสด — คนส. Connect";
    const text = describeFilters(currentFilters);
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        toast.success("แชร์แล้ว");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("คัดลอกลิงก์แล้ว", { icon: <Link2 className="h-4 w-4" /> });
      } else {
        window.prompt("คัดลอกลิงก์นี้", url);
      }
    } catch {
      toast.error("แชร์ไม่สำเร็จ");
    }
  };


  const matchUser = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (u: User | undefined) => {
      if (!u) return false;
      if (region !== "all" && u.region !== region) return false;
      if (issue !== "all" && !u.interests.includes(issue)) return false;
      if (power !== "all") {
        const inHave = u.powers_have.includes(power);
        const inNeed = u.powers_need.includes(power);
        const ok =
          powerMode === "have" ? inHave : powerMode === "need" ? inNeed : inHave || inNeed;
        if (!ok) return false;
      }
      if (needle) {
        const hay = [
          u.name,
          u.organization,
          u.province,
          u.bio,
          ...u.interests.map(issueTh),
          ...u.powers_have.map(powerTh),
          ...u.powers_need.map(powerTh),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    };
  }, [q, region, issue, power, powerMode]);

  const fUsers = useMemo(() => users.filter(matchUser), [users, matchUser]);
  const fConnections = useMemo(
    () => connections.filter((c) => matchUser(userMap[c.user_a]) || matchUser(userMap[c.user_b])),
    [connections, userMap, matchUser],
  );
  const fConnIds = useMemo(() => new Set(fConnections.map((c) => c.id)), [fConnections]);
  const fCommitments = useMemo(
    () => commitments.filter((m) => fConnIds.has(m.connection_id)),
    [commitments, fConnIds],
  );
  const fIdeas = useMemo(
    () =>
      ideas.filter((i) => {
        const owner = users.find((u) => u.id === (i as any).owner_id);
        return activeCount === 0 ? true : matchUser(owner);
      }),
    [ideas, users, matchUser, activeCount],
  );

  // live pulse: keeps relative times and "สด" indicator moving
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const base = activeCount ? 0 : 1;
  const stats = {
    people: base * 136 + fUsers.length,
    connections: base * 83 + fConnections.length,
    ideas: base * 33 + fIdeas.length,
    commitments: base * 23 + fCommitments.length,
  };

  const funnel = useMemo(
    () =>
      STATUS_ORDER.map((s) => ({
        status: s,
        conn: fConnections.filter((c) => c.status === s).length,
        commit: fCommitments.filter((c) => c.status === s).length,
      })),
    [fConnections, fCommitments],
  );
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.conn + f.commit));
  const done = fCommitments.filter((c) => c.status === "Completed").length;
  const completion = fCommitments.length ? Math.round((done / fCommitments.length) * 100) : 0;

  const feed = useMemo<Feed[]>(() => {
    const items: Feed[] = [];
    fConnections.forEach((c) => {
      const a = userMap[c.user_a]?.name ?? "ผู้เข้าร่วม";
      const b = userMap[c.user_b]?.name ?? "ผู้เข้าร่วม";
      items.push({
        id: `c-${c.id}`,
        icon: "connect",
        title: `${a} × ${b}`,
        detail: `แมตช์ ${c.match_score}% · ${STATUS_TH[c.status]}`,
        created_at: c.created_at,
      });
    });
    fCommitments.forEach((m) => {
      const conn = connections.find((c) => c.id === m.connection_id);
      const pair = conn
        ? `${userMap[conn.user_a]?.name ?? "?"} × ${userMap[conn.user_b]?.name ?? "?"}`
        : "คู่เชื่อม";
      items.push({
        id: `m-${m.id}`,
        icon: "commit",
        title: `${pair} นัดลงมือทำ`,
        detail: `${m.description} · ${STATUS_TH[m.status]}`,
        created_at: m.created_at,
      });
    });
    return items
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 12);
  }, [fConnections, fCommitments, userMap]);

  const mine = useMemo(() => {
    if (!me) return null;
    const conns = fConnections.filter((c) => c.user_a === me.id || c.user_b === me.id);
    const ids = new Set(conns.map((c) => c.id));
    const comms = fCommitments.filter((m) => ids.has(m.connection_id));
    return {
      conns,
      comms,
      done: comms.filter((m) => m.status === "Completed").length,
      active: comms.filter((m) => m.status === "In Progress" || m.status === "Planning").length,
    };
  }, [me, fConnections, fCommitments]);

  const topIssues = useMemo(() => {
    const map = new Map<string, number>();
    fUsers.forEach((u) => u.interests.forEach((i) => map.set(i, (map.get(i) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [fUsers]);

  const rank = (key: "powers_have" | "powers_need") => {
    const map = new Map<string, number>();
    fUsers.forEach((u) => u[key].forEach((p) => map.set(p, (map.get(p) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  };

  const byRegion = REGIONS.map((r) => ({
    region: r,
    count: fConnections.filter((c) => {
      const a = userMap[c.user_a];
      const b = userMap[c.user_b];
      return a?.region === r || b?.region === r;
    }).length,
  })).sort((a, b) => b.count - a.count);
  const maxRegion = Math.max(1, ...byRegion.map((r) => r.count));

  // --- ชุดข้อมูลสำหรับส่งออก (อิงตามฟิลเตอร์ปัจจุบัน) ---
  const nameOf = (id: string) => userMap[id]?.name ?? id;

  const matchRows = useMemo<Row[]>(() => {
    if (!me) return [];
    const pool = fUsers.filter((u) => u.id !== me.id);
    return rankMatches(me, pool, pool.length).map((m, i) => ({
      อันดับ: i + 1,
      ชื่อ: m.user.name,
      องค์กร: m.user.organization,
      จังหวัด: m.user.province,
      ภูมิภาค: REGION_LABEL[m.user.region],
      คะแนนแมตช์: m.score,
      เหตุผล: m.reason,
      ประเด็นร่วม: m.user.interests.map(issueTh).join(" | "),
      พลังที่เขามี: m.theyBring.map(powerTh).join(" | "),
      พลังที่เขาต้องการ: m.theyNeed.map(powerTh).join(" | "),
    }));
  }, [me, fUsers]);

  const connectionRows = useMemo<Row[]>(
    () =>
      fConnections.map((c) => ({
        id: c.id,
        คนที่1: nameOf(c.user_a),
        คนที่2: nameOf(c.user_b),
        ภูมิภาค1: userMap[c.user_a] ? REGION_LABEL[userMap[c.user_a]!.region] : "",
        ภูมิภาค2: userMap[c.user_b] ? REGION_LABEL[userMap[c.user_b]!.region] : "",
        คะแนนแมตช์: c.match_score,
        สถานะ: STATUS_TH[c.status],
        สร้างเมื่อ: c.created_at,
      })),
    [fConnections, userMap],
  );

  const commitmentRows = useMemo<Row[]>(
    () =>
      fCommitments.map((m) => {
        const conn = connections.find((c) => c.id === m.connection_id);
        return {
          id: m.id,
          คู่เชื่อม: conn ? `${nameOf(conn.user_a)} × ${nameOf(conn.user_b)}` : m.connection_id,
          ประเภทการลงมือทำ: m.action_type,
          รายละเอียด: m.description,
          สถานะ: STATUS_TH[m.status],
          นัดหมาย: m.follow_up_date ?? "",
          สร้างเมื่อ: m.created_at,
        };
      }),
    [fCommitments, connections, userMap],
  );

  const exportAllJSON = () =>
    downloadJSON("konsor-connect-event-data", {
      exported_at: new Date().toISOString(),
      view,
      filters: { q, region, issue, power, powerMode },
      summary: { ...stats, completion },
      matches: matchRows,
      connections: connectionRows,
      commitments: commitmentRows,
    });

  return (
    <AppShell title="แดชบอร์ดสด" subtitle="คนส. Connect · การแมตช์ การเชื่อม และการลงมือทำแบบเรียลไทม์">
      <div className="px-5 pt-4">
        <div className="flex rounded-2xl border border-border bg-card p-1">
          {(
            [
              { k: "organizer", l: "มุมผู้จัด" },
              { k: "me", l: "มุมของฉัน" },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setView(t.k)}
              className={`tap h-10 flex-1 rounded-xl text-[13px] font-extrabold transition ${
                view === t.k ? "gradient-power text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 px-5 pt-3">
        <div className="flex gap-2">
          <label className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อ องค์กร จังหวัด ประเด็น..."
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            />
            {q && (
              <button type="button" aria-label="ล้างคำค้น" onClick={() => setQ("")} className="tap">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className={`tap flex h-11 items-center gap-1.5 rounded-2xl border border-border px-3 text-[13px] font-extrabold ${
              activeCount ? "gradient-power text-primary-foreground" : "bg-card"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeCount ? activeCount : "กรอง"}
          </button>
          <button
            type="button"
            onClick={shareCurrentUrl}
            aria-label="แชร์ลิงก์หน้านี้"
            title="แชร์ลิงก์หน้าผลลัพธ์ที่ใช้ตัวกรองปัจจุบัน"
            className="tap flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-[13px] font-extrabold text-primary"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {showFilters && (
          <div className="card-soft space-y-2 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                aria-label="ภูมิภาค"
                className="h-10 rounded-xl border border-border bg-background px-2 text-[13px]"
              >
                <option value="all">ทุกภูมิภาค</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {REGION_LABEL[r]}
                  </option>
                ))}
              </select>
              <select
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                aria-label="ประเด็น"
                className="h-10 rounded-xl border border-border bg-background px-2 text-[13px]"
              >
                <option value="all">ทุกประเด็น</option>
                {ISSUES.map((i) => (
                  <option key={i} value={i}>
                    {issueTh(i)}
                  </option>
                ))}
              </select>
              <select
                value={power}
                onChange={(e) => setPower(e.target.value)}
                aria-label="ประเภทพลัง"
                className="h-10 rounded-xl border border-border bg-background px-2 text-[13px]"
              >
                <option value="all">ทุกประเภทพลัง</option>
                {POWERS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.emoji} {p.th}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-1 rounded-xl border border-border bg-background p-1">
                {(
                  [
                    { k: "any", l: "มี/ต้องการ" },
                    { k: "have", l: "มีพลังนี้" },
                    { k: "need", l: "ต้องการพลังนี้" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.k}
                    type="button"
                    onClick={() => setPowerMode(m.k)}
                    className={`tap h-8 flex-1 rounded-lg text-[11px] font-extrabold ${
                      powerMode === m.k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="tap h-10 rounded-xl border border-border px-3 text-[12px] font-extrabold text-muted-foreground"
              >
                ล้าง
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
              <p className="text-[11px] font-bold text-muted-foreground">ชุดตัวกรองที่บันทึกไว้</p>
              <button
                type="button"
                onClick={saveCurrentPreset}
                disabled={activeCount === 0}
                className="tap flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-extrabold disabled:opacity-40"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                บันทึกชุดนี้
              </button>
            </div>
            {presets.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                ยังไม่มีชุดที่บันทึก — เลือกตัวกรองแล้วกด “บันทึกชุดนี้” เพื่อรับแจ้งเตือนเมื่อมีแมตช์หรือคู่เชื่อมต่อใหม่ที่ตรงเงื่อนไข
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <span
                    key={p.id}
                    className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-extrabold ${
                      activePresetId === p.id
                        ? "gradient-power border-transparent text-primary-foreground"
                        : "border-border bg-background"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => applyPreset(p)}
                      title={describeFilters(p.filters)}
                      className="tap"
                    >
                      {p.name}
                    </button>
                    <button
                      type="button"
                      aria-label={p.alerts ? `ปิดแจ้งเตือนชุด ${p.name}` : `เปิดแจ้งเตือนชุด ${p.name}`}
                      title={p.alerts ? "แจ้งเตือนเปิดอยู่" : "แจ้งเตือนปิดอยู่"}
                      onClick={() => toggleAlerts(p.id)}
                      className="tap"
                    >
                      {p.alerts ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3 opacity-60" />}
                    </button>
                    <button
                      type="button"
                      aria-label={`ลบชุด ${p.name}`}
                      onClick={() => removePreset(p.id)}
                      className="tap opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}


        {activeCount > 0 && (
          <p className="text-[11px] font-bold text-muted-foreground">
            กำลังกรอง · {fUsers.length} คน · {fConnections.length} คอนเนกชัน ·{" "}
            {fCommitments.length} คำมั่นสัญญา
          </p>
        )}
      </div>

      <div className="px-5 py-4">
        <div className="relative overflow-hidden rounded-3xl gradient-power p-5 text-primary-foreground">
          <div className="absolute inset-0 text-white/70">
            <NetworkBackground count={20} seed={12} />
          </div>
          <div className="relative flex items-center gap-2 pb-4 text-[11px] font-bold uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-lime animate-pulse-node" />
            สด · อัปเดตอัตโนมัติ
          </div>
          <div className="relative grid grid-cols-2 gap-4">
            {view === "organizer" ? (
              <>
                <Big n={stats.people} label="คน" />
                <Big n={stats.connections} label="คอนเนกชัน" />
                <Big n={stats.ideas} label="ไอเดีย" />
                <Big n={stats.commitments} label="คำมั่นสัญญา" />
              </>
            ) : (
              <>
                <Big n={mine?.conns.length ?? 0} label="คู่เชื่อมของฉัน" />
                <Big n={mine?.comms.length ?? 0} label="นัดลงมือทำ" />
                <Big n={mine?.active ?? 0} label="กำลังทำ" />
                <Big n={mine?.done ?? 0} label="สำเร็จแล้ว" />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-6">
        {view === "me" && !me && (
          <section className="card-soft p-5 text-center">
            <p className="text-sm font-bold">ยังไม่มีโปรไฟล์ในเครื่องนี้</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              สร้างโปรไฟล์เพื่อดูความคืบหน้าการเชื่อมต่อของคุณ
            </p>
            <Link
              to="/onboarding"
              className="tap mt-4 inline-flex h-12 items-center justify-center rounded-2xl gradient-power px-6 text-sm font-extrabold text-primary-foreground"
            >
              สร้างโปรไฟล์
            </Link>
          </section>
        )}

        <Panel title="ความคืบหน้าคำมั่นสัญญา">
          <div className="mb-3 flex items-end justify-between">
            <p className="text-3xl font-extrabold text-gradient">{completion}%</p>
            <p className="text-[12px] font-bold text-muted-foreground">
              สำเร็จ {done}/{fCommitments.length} รายการ
            </p>
          </div>
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-lime transition-all duration-700"
              style={{ width: `${completion}%` }}
            />
          </div>
          {funnel.map((f) => (
            <Bar
              key={f.status}
              label={`${STATUS_TH[f.status]} · เชื่อม ${f.conn} · นัดทำ ${f.commit}`}
              value={f.conn + f.commit}
              max={maxFunnel}
              tone={STATUS_TONE[f.status]}
            />
          ))}
        </Panel>

        <LiveTicker />

        <Panel title={view === "me" ? "กิจกรรมล่าสุดของคุณและทั้งงาน" : "ฟีดกิจกรรมสด"}>
          {feed.length === 0 && (
            <p className="text-[13px] text-muted-foreground">ยังไม่มีกิจกรรม — เริ่มเชื่อมต่อกันเลย</p>
          )}
          <ul className="space-y-2.5">
            {feed.map((f) => (
              <li key={f.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                    f.icon === "connect" ? "bg-primary/12 text-primary" : "bg-lime/20 text-ink"
                  }`}
                >
                  {f.icon === "connect" ? (
                    <Handshake className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">{f.title}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{f.detail}</p>
                </div>
                <span className="ml-auto shrink-0 text-[11px] font-bold text-muted-foreground">
                  {ago(f.created_at, now)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {view === "me" && mine && (
          <Panel title="คู่เชื่อมของฉัน">
            {mine.conns.length === 0 && (
              <p className="text-[13px] text-muted-foreground">ยังไม่มีคู่เชื่อม — ไปหาคนที่ใช่กันก่อน</p>
            )}
            {mine.conns.map((c) => {
              const other = userMap[c.user_a === me?.id ? c.user_b : c.user_a];
              return (
                <Link
                  key={c.id}
                  to="/connection/$id"
                  params={{ id: c.id }}
                  className="tap flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold">{other?.name ?? "ผู้เข้าร่วม"}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      แมตช์ {c.match_score}% · {STATUS_TH[c.status]}
                    </p>
                  </div>
                  <Sparkles className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
            <Link
              to="/matches"
              className="tap mt-1 flex h-12 items-center justify-center gap-2 rounded-2xl border border-border text-sm font-extrabold"
            >
              <Activity className="h-4 w-4" /> หาคู่เชื่อมเพิ่ม
            </Link>
          </Panel>
        )}

        {view === "organizer" && (
          <>
            <Panel title="ประเด็นยอดฮิต">
              {topIssues.map(([issue, count]) => (
                <Bar
                  key={issue}
                  label={issueTh(issue)}
                  value={count}
                  max={topIssues[0]![1]}
                  tone="primary"
                />
              ))}
            </Panel>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Panel title="พลังที่ต้องการมากที่สุด">
                {rank("powers_need").map(([p, c]) => (
                  <Bar
                    key={p}
                    label={`${POWER_EMOJI[p] ?? ""} ${powerTh(p)}`}
                    value={c}
                    max={rank("powers_need")[0]![1]}
                    tone="coral"
                  />
                ))}
              </Panel>
              <Panel title="พลังที่แชร์กันมากที่สุด">
                {rank("powers_have").map(([p, c]) => (
                  <Bar
                    key={p}
                    label={`${POWER_EMOJI[p] ?? ""} ${powerTh(p)}`}
                    value={c}
                    max={rank("powers_have")[0]![1]}
                    tone="lime"
                  />
                ))}
              </Panel>
            </div>

            <Panel title="คอนเนกชันแยกตามภูมิภาค">
              {byRegion.map((r) => (
                <Bar
                  key={r.region}
                  label={REGION_LABEL[r.region]}
                  value={r.count}
                  max={maxRegion}
                  tone="electric"
                />
              ))}
            </Panel>
          </>
        )}
        <Panel title="ส่งออกข้อมูลกิจกรรม">
          <p className="text-[12px] text-muted-foreground">
            ส่งออกตามฟิลเตอร์ปัจจุบัน · แมตช์ {matchRows.length} · คอนเนกชัน {connectionRows.length} ·
            คำมั่นสัญญา {commitmentRows.length}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
            <ExportBtn
              label="แมตช์ (CSV)"
              disabled={matchRows.length === 0}
              onClick={() => downloadCSV("matches", matchRows)}
            />
            <ExportBtn
              label="คอนเนกชัน (CSV)"
              disabled={connectionRows.length === 0}
              onClick={() => downloadCSV("connections", connectionRows)}
            />
            <ExportBtn
              label="คำมั่นสัญญา (CSV)"
              disabled={commitmentRows.length === 0}
              onClick={() => downloadCSV("commitments", commitmentRows)}
            />
          </div>
          <button
            type="button"
            onClick={exportAllJSON}
            className="tap mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-2xl gradient-power text-sm font-extrabold text-primary-foreground"
          >
            <FileJson className="h-4 w-4" /> ส่งออกทั้งหมด (JSON)
          </button>
          {matchRows.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              * ต้องมีโปรไฟล์ของคุณจึงจะส่งออกรายการแมตช์ได้
            </p>
          )}
        </Panel>

      </div>
    </AppShell>
  );
}

function ExportBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tap flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-background px-2 text-[12px] font-extrabold disabled:opacity-40"
    >
      <Download className="h-4 w-4 shrink-0 text-primary" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Big({ n, label }: { n: number; label: string }) {
  const v = useCountUp(n);
  return (
    <div>
      <p className="text-[clamp(2rem,11vw,3rem)] font-extrabold leading-none tracking-tighter">
        {v}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-90">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-soft p-4">
      <h2 className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "primary" | "coral" | "lime" | "electric";
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary",
    coral: "bg-coral",
    lime: "bg-lime",
    electric: "bg-electric",
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold">{label}</p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${bg[tone]} transition-all duration-700`}
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { buildFeed, LiveTicker, RotatingPrompt } from "@/components/live-ticker";
import { LiveProgress } from "@/components/live-progress";
import {
  Activity,
  ArrowUpDown,
  Bell,
  BellOff,
  BookmarkPlus,
  CheckCircle2,
  Handshake,
  Link2,
  LogOut,
  MonitorPlay,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MissionVisual } from "@/components/mission-ui";
import { LiveNetwork, NetworkBackground } from "@/components/network-background";
import { useStore, useUserMap } from "@/lib/store";
import {
  ISSUES,
  POWER_EMOJI,
  POWERS,
  REGIONS,
  type ConnectionStatus,
  type User,
} from "@/lib/types";
import { issueTh, powerTh, REGION_LABEL } from "@/lib/i18n";
import { makeJoinCode } from "@/lib/session";
import {
  loadPresets,
  savePresets,
  sameFilters,
  type DashboardFilters,
  type FilterPreset,
} from "@/lib/filter-presets";
import { relevanceOf, sortScored, SORT_OPTIONS, type SortKey } from "@/lib/relevance";

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  region: z.string().optional().catch(undefined),
  issue: z.string().optional().catch(undefined),
  power: z.string().optional().catch(undefined),
  powerMode: z.enum(["any", "have", "need"]).optional().catch(undefined),
  view: z.enum(["organizer", "me"]).optional().catch(undefined),
  sort: z.string().optional().catch(undefined),
  /** โหมดจอใหญ่สำหรับฉายในงาน */
  present: z.enum(["1"]).optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "พลังในงานตอนนี้ — คนส. Connexts" },
      {
        name: "description",
        content:
          "แดชบอร์ดสดสำหรับผู้จัดและผู้เข้าร่วม: ดูการแมตช์ การเชื่อมต่อ และความคืบหน้าคำมั่นสัญญาแบบเรียลไทม์",
      },
      { property: "og:title", content: "แดชบอร์ดสด — คนส. Connexts" },
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
  const shown = useRef(0); // ตัวเลขที่อยู่บนจอตอนนี้
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = shown.current;
    if (reduce || from === target) {
      shown.current = target;
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = from === 0 ? 1000 : 500; // โหลดครั้งแรกนับขึ้น · อัปเดตสด +1 ให้เร็ว
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const v = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      shown.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // shown.current เก็บค่าที่แสดงอยู่ ถ้าถูกขัดกลางทางจะต่อจากค่านั้นโดยไม่กระโดด
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

function Dashboard() {
  const { me, users, ideas, connections, commitments } = useStore();
  const userMap = useUserMap();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard" });
  const [view, setView] = useState<"organizer" | "me">(search.view ?? "organizer");
  const [now, setNow] = useState(() => Date.now());
  const present = search.present === "1";

  // --- ฟิลเตอร์ขั้นสูง (ใช้ได้ทั้งมุมผู้จัดและมุมของฉัน) ---
  const [q, setQ] = useState<string>(search.q ?? "");
  const [region, setRegion] = useState<string>(search.region ?? "all");
  const [issue, setIssue] = useState<string>(search.issue ?? "all");
  const [power, setPower] = useState<string>(search.power ?? "all");
  const [powerMode, setPowerMode] = useState<"any" | "have" | "need">(search.powerMode ?? "any");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortKey>(
    SORT_OPTIONS.some((s) => s.key === search.sort) ? (search.sort as SortKey) : "relevance",
  );

  // --- ชุดตัวกรองที่บันทึกไว้ ---
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  useEffect(() => setPresets(loadPresets()), []);
  const currentFilters: DashboardFilters = { q, region, issue, power, powerMode };
  const activePresetId = presets.find((p) => sameFilters(p.filters, currentFilters))?.id ?? null;

  // --- sync filters + view to URL so the page is shareable ---
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const next = {
      q: q.trim() || undefined,
      region: region !== "all" ? region : undefined,
      issue: issue !== "all" ? issue : undefined,
      power: power !== "all" ? power : undefined,
      powerMode: powerMode !== "any" ? powerMode : undefined,
      view: view !== "organizer" ? view : undefined,
      sort: sort !== "relevance" ? sort : undefined,
      present: search.present,
    };
    navigate({ search: next, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, region, issue, power, powerMode, view, sort]);

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
    const title = view === "me" ? "มุมของฉัน — คนส. Connexts" : "แดชบอร์ดสด — คนส. Connexts";
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
      // จอใหญ่: แสดงภาพรวมทั้งงานเสมอ ไม่ใช้ตัวกรอง
      if (present) return true;
      if (region !== "all" && u.region !== region) return false;
      if (issue !== "all" && !u.interests.includes(issue)) return false;
      if (power !== "all") {
        const inHave = u.powers_have.includes(power);
        const inNeed = u.powers_need.includes(power);
        const ok = powerMode === "have" ? inHave : powerMode === "need" ? inNeed : inHave || inNeed;
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
  }, [q, region, issue, power, powerMode, present]);

  const fUsers = useMemo(() => users.filter(matchUser), [users, matchUser]);

  // --- ผลการค้นหา: ให้คะแนนความเกี่ยวข้องตามตัวกรอง แล้วเรียงตามตัวเลือก ---
  const results = useMemo(
    () =>
      sortScored(
        fUsers.map((u) => relevanceOf(u, { q, region, issue, power, powerMode }, me ?? null)),
        sort,
      ),
    [fUsers, q, region, issue, power, powerMode, me, sort],
  );
  const [resultLimit, setResultLimit] = useState(8);
  useEffect(() => setResultLimit(8), [q, region, issue, power, powerMode, sort]);
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
        const owner = users.find((u) => u.id === i.owner_id);
        return activeCount === 0 || present ? true : matchUser(owner);
      }),
    [ideas, users, matchUser, activeCount, present],
  );

  // live pulse: keeps relative times and "สด" indicator moving
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // ตัวเลขจริงจากข้อมูล ไม่มีการบวกเพิ่ม
  const stats = {
    people: fUsers.length,
    connections: fConnections.length,
    ideas: fIdeas.length,
    commitments: fCommitments.length,
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

  const feed = useMemo(
    () =>
      buildFeed({
        connections: fConnections,
        commitments: fCommitments,
        allConnections: connections,
        userMap,
        anonymous: false,
      }),
    [fConnections, fCommitments, connections, userMap],
  );

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

  // --- ค้นหาและกรอง: พับไว้ก่อน เปิดเองเมื่อมีตัวกรอง ---
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    if (activeCount > 0) setSearchOpen(true);
  }, [activeCount]);

  // --- จอใหญ่ ---
  const [joinUrl, setJoinUrl] = useState(() => "/join?c=" + makeJoinCode());
  useEffect(() => {
    setJoinUrl(window.location.origin + "/join?c=" + makeJoinCode());
  }, []);

  const openPresent = () => {
    try {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } catch {
      /* เบราว์เซอร์ไม่รองรับเต็มจอ — ใช้โหมดจอใหญ่ได้ตามปกติ */
    }
    navigate({ search: (s) => ({ ...s, present: "1" as const }) });
  };

  const exitPresent = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } catch {
      /* ignore */
    }
    navigate({ search: (s) => ({ ...s, present: undefined }) });
  };

  if (present) {
    const needRank = rank("powers_need");
    const haveRank = rank("powers_have");
    return (
      <main className="core-dashboard-present relative min-h-dvh overflow-hidden bg-background px-[4vw] py-[3vh] text-foreground">
        <header className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[clamp(1.75rem,3.5vw,3.25rem)] font-extrabold leading-tight">
              พลังที่เชื่อมถึงกัน
            </h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[18px] font-extrabold text-primary-foreground">
            <span aria-hidden="true" className="h-3 w-3 animate-pulse-node rounded-full bg-lime" />
            LIVE
          </span>
          <button
            type="button"
            onClick={exitPresent}
            className="tap inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-[16px] font-extrabold"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            ออกจากจอใหญ่
          </button>
        </header>

        <div className="mt-[2vh] rounded-3xl bg-primary px-[2vw] py-[2vh] text-primary-foreground">
          <RotatingPrompt size="lg" />
        </div>

        <div className="mt-[2vh] grid grid-cols-2 gap-[2vw] lg:grid-cols-4">
          <BigCard n={stats.people} label="คน" />
          <BigCard n={stats.connections} label="คู่เชื่อม" />
          <BigCard n={stats.ideas} label="ไอเดีย" />
          <BigCard n={stats.commitments} label="นัดลงมือทำ" />
        </div>

        <div className="mt-[2vh] grid grid-cols-1 gap-[2vw] lg:grid-cols-3">
          <section className="card-soft relative p-5 lg:col-span-2">
            <h2 className="text-[22px] font-extrabold">เครือข่ายที่เกิดขึ้น</h2>
            <div className="mt-3 h-[58vh] min-h-[320px]">
              <LiveNetwork users={fUsers} connections={fConnections} className="h-full" />
            </div>
          </section>

          <div className="space-y-[2vh]">
            <Panel size="lg" title="ประเด็นยอดนิยม">
              {topIssues.slice(0, 4).map(([issue, count]) => (
                <Bar
                  key={issue}
                  size="lg"
                  label={issueTh(issue)}
                  value={count}
                  max={topIssues[0]![1]}
                  tone="primary"
                />
              ))}
            </Panel>
            <Panel size="lg" title="พลังที่ยังตามหา">
              {needRank.slice(0, 3).map(([p, c]) => (
                <Bar
                  key={p}
                  size="lg"
                  label={`${POWER_EMOJI[p] ?? ""} ${powerTh(p)}`}
                  value={c}
                  max={needRank[0]![1]}
                  tone="coral"
                />
              ))}
            </Panel>
            <Panel size="lg" title="พลังพร้อมแบ่งปัน">
              {haveRank.slice(0, 3).map(([p, c]) => (
                <Bar
                  key={p}
                  size="lg"
                  label={`${POWER_EMOJI[p] ?? ""} ${powerTh(p)}`}
                  value={c}
                  max={haveRank[0]![1]}
                  tone="lime"
                />
              ))}
            </Panel>
            <Panel size="lg" title="คู่เชื่อมแต่ละภาค">
              {byRegion
                .filter((r) => r.count > 0)
                .slice(0, 5)
                .map((r) => (
                  <Bar
                    key={r.region}
                    size="lg"
                    label={REGION_LABEL[r.region]}
                    value={r.count}
                    max={maxRegion}
                    tone="electric"
                  />
                ))}
            </Panel>
            <div className="card-soft flex items-center gap-4 p-4">
              <div className="shrink-0 rounded-2xl bg-white p-3">
                <QRCodeSVG value={joinUrl} size={160} level="M" />
              </div>
              <p className="text-[20px] font-extrabold leading-snug">สแกนแล้วมาเชื่อมพลังกัน</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const feedPanel = (
    <Panel title={view === "me" ? "กิจกรรมของคุณและทั้งงาน" : <>การเชื่อมต่อล่าสุด</>}>
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
                <Handshake className="h-4 w-4" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">{f.title}</p>
              <p className="truncate text-[12px] text-muted-foreground">{f.detail}</p>
            </div>
            <span className="ml-auto shrink-0 text-xs font-bold text-muted-foreground">
              {ago(f.created_at, now)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );

  const progressPanel = (
    <Panel title={<>ความคืบหน้า</>}>
      <div className="mb-3 flex items-end justify-between">
        <p className="font-tech text-3xl font-extrabold text-primary">{completion}%</p>
        <p className="text-[12px] font-bold text-muted-foreground">
          สำเร็จ {done}/{fCommitments.length} นัด
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
      {view === "organizer" && (
        <Link
          to="/admin/export"
          className="tap mt-1 inline-flex min-h-11 items-center text-[12px] font-bold text-muted-foreground underline underline-offset-4"
        >
          ผู้จัด: ดาวน์โหลดข้อมูล
        </Link>
      )}
    </Panel>
  );

  const needRank = rank("powers_need");
  const haveRank = rank("powers_have");

  return (
    <AppShell
      title="พลังในงานตอนนี้"
      titleEn="Live dashboard"
      action={
        view === "organizer" ? (
          <button
            type="button"
            onClick={openPresent}
            className="tap inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-[13px] font-extrabold"
          >
            <MonitorPlay className="h-4 w-4" aria-hidden="true" />
            เปิดจอใหญ่
          </button>
        ) : undefined
      }
    >
      <div className="core-page core-dashboard">
        <div className="core-dashboard-modes px-5 pt-4">
          <div className="core-mode-tabs flex rounded-2xl border border-border bg-card p-1">
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
                aria-pressed={view === t.k}
                className={`tap h-11 flex-1 rounded-xl text-[13px] font-extrabold transition ${
                  view === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div className="core-dashboard-filter px-5 pt-3">
          <details
            open={searchOpen}
            onToggle={(e) => setSearchOpen(e.currentTarget.open)}
            className="card-soft"
          >
            <summary className="tap flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 text-sm font-extrabold">
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ค้นหาและกรอง
              </span>
              {activeCount > 0 && (
                <span className="text-[12px] text-muted-foreground">{activeCount} ตัวกรอง</span>
              )}
            </summary>

            <div className="space-y-2 px-3 pb-3">
              <div className="flex min-w-0 gap-2">
                <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">ค้นหาคนในงาน</span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหาชื่อ องค์กร จังหวัด ประเด็น..."
                    className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                  />
                  {q && (
                    <button
                      type="button"
                      aria-label="ล้างคำค้น"
                      onClick={() => setQ("")}
                      className="tap -mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    >
                      <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  aria-label={activeCount ? `กรอง · เลือกไว้ ${activeCount} รายการ` : undefined}
                  className={`tap flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border px-3 text-[13px] font-extrabold ${
                    activeCount
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  {activeCount ? activeCount : "กรอง"}
                </button>
                <button
                  type="button"
                  onClick={shareCurrentUrl}
                  aria-label="แชร์ลิงก์หน้านี้"
                  title="แชร์ลิงก์หน้าผลลัพธ์ที่ใช้ตัวกรองปัจจุบัน"
                  className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-[13px] font-extrabold text-primary"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {showFilters && (
                <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      aria-label="ภูมิภาค"
                      className="h-11 rounded-xl border border-border bg-background px-2 text-[13px]"
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
                      className="h-11 rounded-xl border border-border bg-background px-2 text-[13px]"
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
                      className="h-11 rounded-xl border border-border bg-background px-2 text-[13px]"
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
                          aria-pressed={powerMode === m.k}
                          className={`tap h-9 flex-1 rounded-lg text-xs font-extrabold ${
                            powerMode === m.k
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {m.l}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="tap h-11 rounded-xl border border-border px-3 text-[12px] font-extrabold text-muted-foreground"
                    >
                      ล้าง
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                    <p className="text-xs font-bold text-muted-foreground">
                      ชุดตัวกรองที่บันทึกไว้
                    </p>
                    <button
                      type="button"
                      onClick={saveCurrentPreset}
                      disabled={activeCount === 0}
                      className="tap flex h-9 items-center gap-1 rounded-lg border border-border px-2 text-xs font-extrabold disabled:opacity-40"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      บันทึกชุดนี้
                    </button>
                  </div>
                  {presets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      บันทึกตัวกรองเพื่อรับแจ้งเตือนเมื่อมีคนใหม่ที่ตรงเงื่อนไข
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {presets.map((p) => (
                        <span
                          key={p.id}
                          className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-extrabold ${
                            activePresetId === p.id
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border bg-background"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => applyPreset(p)}
                            title={describeFilters(p.filters)}
                            aria-pressed={activePresetId === p.id}
                            className="tap min-h-6 px-1"
                          >
                            {p.name}
                          </button>
                          <button
                            type="button"
                            aria-label={
                              p.alerts ? `ปิดแจ้งเตือนชุด ${p.name}` : `เปิดแจ้งเตือนชุด ${p.name}`
                            }
                            aria-pressed={p.alerts}
                            title={p.alerts ? "แจ้งเตือนเปิดอยู่" : "แจ้งเตือนปิดอยู่"}
                            onClick={() => toggleAlerts(p.id)}
                            className="tap relative grid h-6 w-6 place-items-center rounded-full after:absolute after:-inset-2 after:content-['']"
                          >
                            {p.alerts ? (
                              <Bell className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <BellOff className="h-3 w-3 opacity-60" aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label={`ลบชุด ${p.name}`}
                            onClick={() => removePreset(p.id)}
                            className="tap relative grid h-6 w-6 place-items-center rounded-full opacity-70 after:absolute after:-inset-2 after:content-['']"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="-mx-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-0.5">
                <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-muted-foreground">
                  <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" /> เรียงโดย
                </span>
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSort(s.key)}
                    aria-pressed={sort === s.key}
                    className={`tap shrink-0 rounded-full border px-2.5 py-1 text-xs font-extrabold ${
                      sort === s.key
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {activeCount > 0 && (
                <p className="text-xs font-bold text-muted-foreground">
                  กำลังกรอง · {fUsers.length} คน · {fConnections.length} คู่เชื่อม ·{" "}
                  {fCommitments.length} นัดลงมือทำ
                </p>
              )}

              <div className="pt-1">
                <h2 className="mb-2 text-[13px] font-extrabold text-muted-foreground">
                  ผลการค้นหา · {results.length} คน · เรียงตาม
                  {SORT_OPTIONS.find((s) => s.key === sort)?.label ?? ""}
                </h2>
                {results.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">
                    ไม่พบคนที่ตรงตัวกรอง ลองล้างหรือเปลี่ยนคำค้น
                  </p>
                ) : (
                  <div className="space-y-2">
                    {results.slice(0, resultLimit).map((r) => (
                      <Link
                        key={r.user.id}
                        to="/people/$id"
                        params={{ id: r.user.id }}
                        className="tap flex items-center gap-3 rounded-2xl border border-border bg-background p-2.5"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-lg">
                          {r.user.photo ? (
                            <img
                              src={r.user.photo}
                              alt=""
                              className="h-10 w-10 rounded-xl object-cover"
                            />
                          ) : (
                            <span aria-hidden="true">{r.user.avatar}</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="truncate text-[13px] font-extrabold">
                              {r.user.name}
                            </span>
                            <span className="shrink-0 text-xs font-bold text-muted-foreground">
                              {REGION_LABEL[r.user.region]}
                            </span>
                          </span>
                          <span className="mt-0.5 flex flex-wrap gap-1">
                            {r.reasons.map((reason) => (
                              <span
                                key={reason}
                                className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-bold text-muted-foreground"
                              >
                                {reason}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-tech text-sm font-extrabold tabular-nums text-primary">
                            {r.relevance}%
                          </span>
                          <span className="block text-xs font-bold text-muted-foreground">
                            {r.match != null ? `แมตช์ ${r.match}%` : "ความเกี่ยวข้อง"}
                          </span>
                        </span>
                      </Link>
                    ))}
                    {results.length > resultLimit && (
                      <button
                        type="button"
                        onClick={() => setResultLimit((n) => n + 12)}
                        className="tap h-11 w-full rounded-2xl border border-border text-[12px] font-extrabold"
                      >
                        ดูเพิ่ม ({results.length - resultLimit})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>

        <div className="core-dashboard-overview px-5 py-4">
          <div className="core-live-metrics relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground">
            <div className="absolute inset-0 text-white/70">
              <NetworkBackground count={20} seed={12} />
            </div>
            <div className="relative flex items-center gap-2 pb-3 text-[13px] font-bold">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-lime animate-pulse-node"
              />
              LIVE
            </div>
            <div className="relative pb-4">
              <RotatingPrompt />
            </div>
            <div className="core-live-metric-grid relative grid grid-cols-2 gap-4">
              {view === "organizer" ? (
                <>
                  <Big n={stats.people} label="คน" />
                  <Big n={stats.connections} label="คู่เชื่อม" />
                  <Big n={stats.ideas} label="ไอเดีย" />
                  <Big n={stats.commitments} label="นัดลงมือทำ" />
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

        <div className="core-dashboard-grid px-5 pb-6">
          {view === "organizer" && (
            <>
              <section className="core-network-panel card-soft p-4">
                <p className="mission-kicker">LIVE CONNECTIONS</p>
                <h2 className="text-[15px] font-extrabold">เครือข่ายที่เกิดขึ้น</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {fConnections.length} คู่ในแผนที่นี้
                </p>
                <div className="core-live-network mx-auto mt-3 aspect-[5/8] max-h-[420px] w-full">
                  <LiveNetwork
                    users={fUsers}
                    connections={fConnections}
                    className="h-full"
                    emptyAction={
                      <Link
                        to="/matches"
                        className="tap inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-[13px] font-extrabold text-primary-foreground"
                      >
                        หาคนที่ใช่
                      </Link>
                    }
                  />
                </div>
              </section>

              <Panel title="ประเด็นยอดนิยม">
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

              <div className="core-resource-panels grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Panel title="พลังที่ยังตามหา">
                  {needRank.map(([p, c]) => (
                    <Bar
                      key={p}
                      label={`${POWER_EMOJI[p] ?? ""} ${powerTh(p)}`}
                      value={c}
                      max={needRank[0]![1]}
                      tone="coral"
                    />
                  ))}
                </Panel>
                <Panel title="พลังพร้อมแบ่งปัน">
                  {haveRank.map(([p, c]) => (
                    <Bar
                      key={p}
                      label={`${POWER_EMOJI[p] ?? ""} ${powerTh(p)}`}
                      value={c}
                      max={haveRank[0]![1]}
                      tone="lime"
                    />
                  ))}
                </Panel>
              </div>

              <Panel title="คู่เชื่อมแต่ละภาค">
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

              {feedPanel}
              {progressPanel}
            </>
          )}

          {view === "me" && (
            <>
              {!me && (
                <section className="core-empty mission-empty">
                  <MissionVisual variant="profile" className="core-empty-visual" />
                  <p className="mission-kicker">YOUR PERSONAL VIEW</p>
                  <p className="text-sm font-bold">ยังไม่มีโปรไฟล์ในเครื่องนี้</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    สร้างโปรไฟล์เพื่อดูคู่เชื่อมของคุณ
                  </p>
                  <Link
                    to="/onboarding"
                    className="tap mt-4 inline-flex h-12 items-center justify-center rounded-2xl gradient-power px-6 text-sm font-extrabold text-primary-foreground"
                  >
                    สร้างโปรไฟล์
                  </Link>
                </section>
              )}

              <LiveProgress />

              {mine && (
                <Panel title="คู่เชื่อมของฉัน">
                  {mine.conns.length === 0 && (
                    <p className="text-[13px] text-muted-foreground">
                      ยังไม่มีคู่เชื่อม — ไปหาคนที่ใช่กันก่อน
                    </p>
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
                          <Users className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold">
                            {other?.name ?? "ผู้เข้าร่วม"}
                          </p>
                          <p className="truncate text-[12px] text-muted-foreground">
                            แมตช์ {c.match_score}% · {STATUS_TH[c.status]}
                          </p>
                        </div>
                        <Sparkles
                          className="ml-auto h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </Link>
                    );
                  })}
                  <Link
                    to="/matches"
                    className="tap mt-1 flex h-12 items-center justify-center gap-2 rounded-2xl border border-border text-sm font-extrabold"
                  >
                    <Activity className="h-4 w-4" aria-hidden="true" /> หาคู่เชื่อมเพิ่ม
                  </Link>
                </Panel>
              )}

              {feedPanel}
              {progressPanel}
            </>
          )}

          <LiveTicker toastOnly />
        </div>
      </div>
    </AppShell>
  );
}

function BigCard({ n, label }: { n: number; label: string }) {
  const v = useCountUp(n);
  return (
    <div className="core-screen-stat card-soft rounded-3xl p-[2vw]">
      <p
        key={n}
        className="font-tech animate-pop text-[clamp(3rem,8vw,9rem)] font-extrabold leading-none text-primary"
      >
        {v}
      </p>
      <p className="mt-2 text-[clamp(1.125rem,1.8vw,1.75rem)] font-extrabold">{label}</p>
    </div>
  );
}

function Big({ n, label }: { n: number; label: React.ReactNode }) {
  const v = useCountUp(n);
  return (
    <div>
      <p
        key={n}
        className="font-tech animate-pop text-[clamp(2rem,11vw,3rem)] font-extrabold leading-none"
      >
        {v}
      </p>
      <p className="text-[13px] font-bold">{label}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  size = "md",
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <section className="core-data-panel card-soft p-4">
      <h2
        className={`mb-3 font-extrabold ${
          size === "lg" ? "text-[20px] text-foreground" : "text-[13px] text-muted-foreground"
        }`}
      >
        {title}
      </h2>
      <div className="core-data-panel-body space-y-2">
        {Array.isArray(children) && children.length === 0 ? (
          <div className="core-data-empty">
            <span aria-hidden="true">—</span>
            <p>ข้อมูลจะแสดงเมื่อมีการร่วมกิจกรรม</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
  size = "md",
}: {
  label: string;
  value: number;
  max: number;
  tone: "primary" | "coral" | "lime" | "electric";
  size?: "md" | "lg";
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary",
    coral: "bg-coral",
    lime: "bg-lime",
    electric: "bg-electric",
  };
  const lg = size === "lg";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <p className={`truncate font-bold ${lg ? "text-[18px]" : "text-[13px]"}`}>{label}</p>
        <div className={`mt-1 overflow-hidden rounded-full bg-muted ${lg ? "h-3" : "h-2"}`}>
          <div
            className={`h-full rounded-full ${bg[tone]} transition-all duration-700`}
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
      </div>
      <span className={`font-tech font-extrabold tabular-nums ${lg ? "text-2xl" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}

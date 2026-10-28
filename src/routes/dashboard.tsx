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
  ChevronDown,
  Handshake,
  Link2,
  LogOut,
  MonitorPlay,
  RotateCcw,
  RotateCw,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ChoicePill } from "@/components/choice-pill";
import { LiveNetwork } from "@/components/network-background";
import { Avatar, PowerIcon } from "@/components/power-bits";
import { BLOCK_TAG } from "@/lib/issue-colors";
import { useStore, useUserMap } from "@/lib/store";
import { ISSUES, POWERS, REGIONS, type ConnectionStatus, type User } from "@/lib/types";
import { issueTh, powerTh, REGION_LABEL, regionLabel } from "@/lib/i18n";
import { makeJoinCode } from "@/lib/session";
import {
  loadPresets,
  savePresets,
  sameFilters,
  type DashboardFilters,
  type FilterPreset,
} from "@/lib/filter-presets";
import { presentParam } from "@/lib/dashboard-search";
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
  present: presentParam,
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
      f.region !== "all" ? regionLabel(f.region) || null : null,
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
        toast.success("คัดลอกลิงก์แล้ว", { icon: <Link2 className="h-5 w-5" /> });
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
      <main className="relative min-h-dvh overflow-hidden bg-paper px-[4vw] py-[3vh] text-ink">
        <header className="flex flex-wrap items-center gap-4">
          <div className="w-full min-w-0 sm:w-auto sm:flex-1">
            <h1 className="font-heading text-[clamp(1.75rem,3.5vw,3.25rem)] leading-tight font-bold text-ink">
              พลังที่เชื่อมถึงกัน
            </h1>
          </div>
          <span className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 text-body font-semibold text-white">
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-pulse-node rounded-full bg-block-yellow"
            />
            สด
          </span>
          <button type="button" onClick={exitPresent} className="meadow-btn-secondary">
            <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
            ออกจากจอใหญ่
          </button>
        </header>

        <div className="mt-[2vh] rounded-3xl bg-primary px-[2vw] py-[2vh] text-white">
          <RotatingPrompt size="lg" touch />
        </div>

        <div className="mt-[2vh] grid grid-cols-2 gap-[2vw] lg:grid-cols-4">
          <BigCard n={stats.people} label="คน" tag={BLOCK_TAG.purple} />
          <BigCard n={stats.connections} label="คู่เชื่อม" tag={BLOCK_TAG.blue} />
          <BigCard n={stats.ideas} label="ไอเดีย" tag={BLOCK_TAG.green} />
          <BigCard n={stats.commitments} label="นัดลงมือทำ" tag={BLOCK_TAG.orange} />
        </div>

        <div className="mt-[2vh] grid grid-cols-1 gap-[2vw] lg:grid-cols-3">
          <section className="meadow-card relative p-5 lg:col-span-2">
            <h2 className="font-heading text-title font-semibold! text-ink">
              เครือข่ายที่เกิดขึ้น
            </h2>
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
                  label={<PowerLabel name={p} />}
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
                  label={<PowerLabel name={p} />}
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
                    label={regionLabel(r.region)}
                    value={r.count}
                    max={maxRegion}
                    tone="electric"
                  />
                ))}
            </Panel>
            <div className="meadow-card flex items-center gap-4 p-4">
              <div className="shrink-0 rounded-2xl bg-white p-3">
                <QRCodeSVG value={joinUrl} size={160} level="M" />
              </div>
              <p className="font-heading text-lead leading-snug font-semibold text-ink">
                สแกนแล้วมาเชื่อมพลังกัน
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const feedPanel = (
    <Panel title={view === "me" ? "กิจกรรมของคุณและทั้งงาน" : "การเชื่อมต่อล่าสุด"}>
      {feed.length === 0 && (
        <p className="text-body text-ink-soft">ยังไม่มีกิจกรรม — เริ่มเชื่อมต่อกันเลย</p>
      )}
      <ul className="space-y-3">
        {feed.map((f) => (
          <li key={f.id} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white ${
                f.icon === "connect" ? "bg-primary" : "bg-block-green"
              }`}
            >
              {f.icon === "connect" ? (
                <Handshake className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="line-clamp-2 text-body font-semibold break-words text-ink">{f.title}</p>
              <p className="line-clamp-2 text-body break-words text-ink-soft">{f.detail}</p>
              <p className="text-body text-ink-soft">{ago(f.created_at, now)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );

  const progressPanel = (
    <Panel title="ความคืบหน้า">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className="font-heading text-display leading-none font-bold text-primary">
          {completion}%
        </p>
        <p className="text-body font-semibold text-ink-soft">
          สำเร็จ {done}/{fCommitments.length} นัด
        </p>
      </div>
      <div className="mb-3 h-3 overflow-hidden rounded-full bg-sky-soft">
        <div
          className="h-full rounded-full bg-block-green transition-all duration-700 motion-reduce:transition-none"
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
        <Link to="/admin/export" className="meadow-btn-secondary mt-2 w-full">
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
      action={
        view === "organizer" ? (
          <button type="button" onClick={openPresent} className="meadow-btn-secondary">
            <MonitorPlay className="h-6 w-6 shrink-0" aria-hidden="true" />
            เปิดจอใหญ่
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5 pb-8">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sky-soft p-1.5">
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
              className={`tap min-h-14 rounded-xl text-body font-semibold ${
                view === t.k ? "bg-primary text-white" : "bg-white text-ink"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        <details
          open={searchOpen}
          onToggle={(e) => setSearchOpen(e.currentTarget.open)}
          className="meadow-card group"
        >
          <summary className="tap flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-body font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <Search className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              ค้นหาและกรอง
            </span>
            <span className="flex items-center gap-2">
              {activeCount > 0 && (
                <span className="inline-flex min-h-10 items-center rounded-xl bg-primary px-3 text-body font-semibold text-white">
                  {activeCount} ตัวกรอง
                </span>
              )}
              <ChevronDown
                className="h-6 w-6 shrink-0 transition-transform motion-reduce:transition-none group-open:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>

          <div className="space-y-4 px-4 pb-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-ink-soft"
                aria-hidden="true"
              />
              <label>
                <span className="sr-only">ค้นหาคนในงาน</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ค้นหาชื่อ องค์กร จังหวัด ประเด็น..."
                  className="w-full min-w-0 rounded-xl border-2 bg-white pl-12 pr-14 text-body text-ink"
                />
              </label>
              {q && (
                <button
                  type="button"
                  aria-label="ล้างคำค้น"
                  onClick={() => setQ("")}
                  className="tap absolute right-1 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full"
                >
                  <X className="h-6 w-6 text-ink-soft" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className={`tap inline-flex min-h-14 items-center gap-2 rounded-xl border-2 px-4 text-body font-semibold ${
                  activeCount
                    ? "border-primary bg-primary text-white"
                    : "border-ink bg-white text-ink"
                }`}
              >
                <SlidersHorizontal className="h-6 w-6 shrink-0" aria-hidden="true" />
                {activeCount ? `กรอง · เลือกไว้ ${activeCount}` : "กรอง"}
              </button>
              <button
                type="button"
                onClick={shareCurrentUrl}
                className="tap inline-flex min-h-14 items-center gap-2 rounded-xl border-2 border-ink bg-white px-4 text-body font-semibold text-ink"
              >
                <Share2 className="h-6 w-6 shrink-0" aria-hidden="true" />
                แชร์ลิงก์
              </button>
            </div>

            {showFilters && (
              <div className="space-y-4 rounded-2xl bg-sky-soft p-4">
                <div className="grid grid-cols-1 gap-3">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    aria-label="ภูมิภาค"
                    className="w-full rounded-xl border-2 bg-white px-3 text-body text-ink"
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
                    className="w-full rounded-xl border-2 bg-white px-3 text-body text-ink"
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
                    className="w-full rounded-xl border-2 bg-white px-3 text-body text-ink"
                  >
                    <option value="all">ทุกประเภทพลัง</option>
                    {POWERS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.th}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { k: "any", l: "มี/ต้องการ" },
                      { k: "have", l: "มีพลังนี้" },
                      { k: "need", l: "ต้องการพลังนี้" },
                    ] as const
                  ).map((m) => (
                    <ChoicePill
                      key={m.k}
                      active={powerMode === m.k}
                      onClick={() => setPowerMode(m.k)}
                    >
                      {m.l}
                    </ChoicePill>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="meadow-btn-secondary w-full"
                >
                  ล้างตัวกรอง
                </button>

                <div className="space-y-3 border-t-2 border-white pt-4">
                  <p className="text-body font-semibold text-ink">ชุดตัวกรองที่บันทึกไว้</p>
                  <button
                    type="button"
                    onClick={saveCurrentPreset}
                    disabled={activeCount === 0}
                    className="meadow-btn-secondary w-full"
                  >
                    <BookmarkPlus className="h-6 w-6 shrink-0" aria-hidden="true" />
                    บันทึกชุดนี้
                  </button>
                  {presets.length === 0 ? (
                    <p className="text-body text-ink-soft">
                      บันทึกตัวกรองเพื่อรับแจ้งเตือนเมื่อมีคนใหม่ที่ตรงเงื่อนไข
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {presets.map((p) => (
                        <span
                          key={p.id}
                          className={`flex max-w-full items-center rounded-full border-2 ${
                            activePresetId === p.id
                              ? "border-primary bg-primary text-white"
                              : "border-[#C9C6E0] bg-white text-ink"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => applyPreset(p)}
                            title={describeFilters(p.filters)}
                            aria-pressed={activePresetId === p.id}
                            className="tap min-h-12 min-w-0 px-4 text-left text-body font-semibold break-words"
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
                            className="tap grid h-12 w-12 shrink-0 place-items-center rounded-full"
                          >
                            {p.alerts ? (
                              <Bell className="h-6 w-6" aria-hidden="true" />
                            ) : (
                              <BellOff className="h-6 w-6 opacity-60" aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label={`ลบชุด ${p.name}`}
                            onClick={() => removePreset(p.id)}
                            className="tap grid h-12 w-12 shrink-0 place-items-center rounded-full"
                          >
                            <X className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 flex items-center gap-2 text-body font-semibold text-ink">
                <ArrowUpDown className="h-5 w-5 shrink-0" aria-hidden="true" /> เรียงโดย
              </p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((s) => (
                  <ChoicePill key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
                    {s.label}
                  </ChoicePill>
                ))}
              </div>
            </div>

            {activeCount > 0 && (
              <p className="text-body font-semibold text-ink-soft">
                กำลังกรอง · {fUsers.length} คน · {fConnections.length} คู่เชื่อม ·{" "}
                {fCommitments.length} นัดลงมือทำ
              </p>
            )}

            <div>
              <h2 className="mb-3 text-body font-semibold text-ink-soft">
                ผลการค้นหา · {results.length} คน · เรียงตาม
                {SORT_OPTIONS.find((s) => s.key === sort)?.label ?? ""}
              </h2>
              {results.length === 0 ? (
                <p className="text-body text-ink-soft">
                  ไม่พบคนที่ตรงตัวกรอง ลองล้างหรือเปลี่ยนคำค้น
                </p>
              ) : (
                <div className="space-y-3">
                  {results.slice(0, resultLimit).map((r) => (
                    <Link
                      key={r.user.id}
                      to="/people/$id"
                      params={{ id: r.user.id }}
                      className="tap flex items-start gap-3 rounded-2xl bg-sky-soft p-3"
                    >
                      <Avatar user={r.user} size={48} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-body font-semibold break-words text-ink">
                          {r.user.name}
                        </span>
                        {regionLabel(r.user.region) && (
                          <span className="block text-body text-ink-soft">
                            {regionLabel(r.user.region)}
                          </span>
                        )}
                        <span className="block text-body font-semibold text-primary">
                          ความเกี่ยวข้อง {r.relevance}%
                          {r.match != null ? ` · แมตช์ ${r.match}%` : ""}
                        </span>
                        {r.reasons.length > 0 && (
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            {r.reasons.map((reason) => (
                              <span
                                key={reason}
                                className="inline-flex min-h-10 items-center rounded-xl bg-white px-3 py-1 text-body font-semibold text-ink"
                              >
                                {reason}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    </Link>
                  ))}
                  {results.length > resultLimit && (
                    <button
                      type="button"
                      onClick={() => setResultLimit((n) => n + 12)}
                      className="meadow-btn-secondary w-full"
                    >
                      ดูเพิ่ม ({results.length - resultLimit})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </details>

        <section aria-label="ตัวเลขสดของงาน" className="meadow-card bg-sky-soft p-5">
          <p className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-body font-semibold text-white">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 animate-pulse-node rounded-full bg-block-yellow"
            />
            ข้อมูลสด
          </p>
          <div className="py-3 text-ink">
            <RotatingPrompt tone="card" touch />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {view === "organizer" ? (
              <>
                <Big n={stats.people} label="คน" tag={BLOCK_TAG.purple} />
                <Big n={stats.connections} label="คู่เชื่อม" tag={BLOCK_TAG.blue} />
                <Big n={stats.ideas} label="ไอเดีย" tag={BLOCK_TAG.green} />
                <Big n={stats.commitments} label="นัดลงมือทำ" tag={BLOCK_TAG.orange} />
              </>
            ) : (
              <>
                <Big n={mine?.conns.length ?? 0} label="คู่เชื่อมของฉัน" tag={BLOCK_TAG.purple} />
                <Big n={mine?.comms.length ?? 0} label="นัดลงมือทำ" tag={BLOCK_TAG.blue} />
                <Big n={mine?.active ?? 0} label="กำลังทำ" tag={BLOCK_TAG.green} />
                <Big n={mine?.done ?? 0} label="สำเร็จแล้ว" tag={BLOCK_TAG.orange} />
              </>
            )}
          </div>
        </section>

        <div className="space-y-5">
          {view === "organizer" && (
            <>
              <section className="meadow-card p-5">
                <h2 className="font-heading text-lead font-semibold! text-ink">
                  เครือข่ายที่เกิดขึ้น
                </h2>
                <p className="mt-1 text-body text-ink-soft">{fConnections.length} คู่ในแผนที่นี้</p>
                <div className="mx-auto mt-3 aspect-[5/8] max-h-[420px] w-full">
                  <LiveNetwork
                    users={fUsers}
                    connections={fConnections}
                    className="h-full"
                    emptyAction={
                      <Link to="/" className="meadow-btn-primary">
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

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="พลังที่ยังตามหา">
                  {needRank.map(([p, c]) => (
                    <Bar
                      key={p}
                      label={<PowerLabel name={p} />}
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
                      label={<PowerLabel name={p} />}
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
                    label={regionLabel(r.region)}
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
                <section className="meadow-card p-6 text-center">
                  <span
                    aria-hidden="true"
                    className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sky-soft text-primary"
                  >
                    <UserRound className="h-8 w-8" />
                  </span>
                  <h2 className="mt-4 font-heading text-title font-semibold! text-ink">
                    ยังไม่มีโปรไฟล์ในเครื่องนี้
                  </h2>
                  <p className="mt-2 text-body text-ink-soft">สร้างโปรไฟล์เพื่อดูคู่เชื่อมของคุณ</p>
                  <Link to="/onboarding" className="meadow-btn-primary mt-5 w-full">
                    สร้างโปรไฟล์
                  </Link>
                </section>
              )}

              <LiveProgress />

              {mine && (
                <Panel title="คู่เชื่อมของฉัน">
                  {mine.conns.length === 0 && (
                    <p className="text-body text-ink-soft">
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
                        className="tap flex items-center gap-3 rounded-2xl bg-sky-soft p-3"
                      >
                        <span
                          aria-hidden="true"
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-white"
                        >
                          <Users className="h-6 w-6" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-body font-semibold break-words text-ink">
                            {other?.name ?? "ผู้เข้าร่วม"}
                          </p>
                          <p className="text-body text-ink-soft">
                            แมตช์ {c.match_score}% · {STATUS_TH[c.status]}
                          </p>
                        </div>
                        <Sparkles className="h-6 w-6 shrink-0 text-ink-soft" aria-hidden="true" />
                      </Link>
                    );
                  })}
                  <Link to="/" className="meadow-btn-secondary mt-1 w-full">
                    <Activity className="h-6 w-6 shrink-0" aria-hidden="true" /> หาคู่เชื่อมเพิ่ม
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

function BigCard({ n, label, tag }: { n: number; label: string; tag: { bg: string; fg: string } }) {
  const v = useCountUp(n);
  return (
    <div className="rounded-3xl p-[2vw]" style={{ backgroundColor: tag.bg, color: tag.fg }}>
      <p
        key={n}
        className="animate-pop font-heading text-[clamp(3rem,8vw,9rem)] leading-none font-bold text-inherit"
      >
        {v}
      </p>
      <p className="mt-2 text-[clamp(1.375rem,1.8vw,1.75rem)] font-semibold">{label}</p>
    </div>
  );
}

function Big({
  n,
  label,
  tag,
}: {
  n: number;
  label: React.ReactNode;
  tag: { bg: string; fg: string };
}) {
  const v = useCountUp(n);
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: tag.bg, color: tag.fg }}>
      <p
        key={n}
        className="animate-pop font-heading text-[clamp(2rem,11vw,3rem)] leading-none font-bold text-inherit"
      >
        {v}
      </p>
      <p className="mt-1 text-body font-semibold break-words">{label}</p>
    </div>
  );
}

function PowerLabel({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <PowerIcon name={name} className="h-6 w-6 shrink-0 text-primary" />
      {powerTh(name)}
    </span>
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
    <section className="meadow-card p-5">
      <h2
        className={`mb-3 font-heading font-semibold! text-ink ${
          size === "lg" ? "text-title" : "text-lead"
        }`}
      >
        {title}
      </h2>
      <div className="space-y-3">
        {Array.isArray(children) && children.length === 0 ? (
          <div className="rounded-2xl bg-sky-soft p-4 text-center">
            <p className="text-body text-ink-soft">ข้อมูลจะแสดงเมื่อมีการร่วมกิจกรรม</p>
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
  label: React.ReactNode;
  value: number;
  max: number;
  tone: "primary" | "coral" | "lime" | "electric";
  size?: "md" | "lg";
}) {
  const bg: Record<string, string> = {
    primary: "bg-primary",
    coral: "bg-block-orange",
    lime: "bg-block-green",
    electric: "bg-block-blue",
  };
  const lg = size === "lg";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={`min-w-0 font-semibold break-words text-ink ${lg ? "text-lead" : "text-body"}`}
        >
          {label}
        </p>
        <span
          className={`shrink-0 font-heading font-bold text-ink tabular-nums ${lg ? "text-title" : "text-lead"}`}
        >
          {value}
        </span>
      </div>
      <div className={`mt-1 overflow-hidden rounded-full bg-sky-soft ${lg ? "h-4" : "h-3"}`}>
        <div
          className={`h-full rounded-full ${bg[tone]} transition-all duration-700 motion-reduce:transition-none`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

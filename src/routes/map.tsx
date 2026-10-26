import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ExploreTabs } from "@/components/explore-tabs";
import { MissionVisual } from "@/components/mission-ui";
import { Avatar, Chip, PowerChip } from "@/components/power-bits";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useStore } from "@/lib/store";
import { rankMatches } from "@/lib/matching";
import { useMotionSettings } from "@/lib/motion";
import { ISSUES, POWERS, REGIONS, type Generation, type Region } from "@/lib/types";
import { GENERATION_TH, issueTh, powerTh, provinceTh, REGION_LABEL } from "@/lib/i18n";
import { MAP_VIEWBOX, PROVINCES, type ProvinceShape } from "@/lib/thailand-geo";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "แผนที่พลัง — คนส. Connexts" },
      {
        name: "description",
        content:
          "ดูว่าใครอยู่จังหวัดไหน ทำเรื่องอะไร แล้วชวนกันลงมือ พร้อมเล่าเรื่องจากพื้นที่ของคุณ",
      },
      { property: "og:title", content: "แผนที่พลังประเทศไทย" },
      { property: "og:description", content: "ดูคน ไอเดีย และเรื่องราวรายจังหวัดทั่วประเทศ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PowerMap,
});

const REGION_FILL: Record<Region, string> = {
  North: "var(--color-primary)",
  Northeast: "var(--color-coral)",
  Central: "var(--color-electric)",
  Bangkok: "var(--color-ink)",
  South: "var(--color-lime)",
  Nationwide: "var(--color-primary)",
};

const CLUSTERS = [
  "Youth",
  "Mental Health",
  "Gender Equality",
  "Community Health",
  "Policy",
  "Digital Innovation",
] as const;

/** Bubble radius (viewBox units) — ~9–12px on a 375px phone. */
const bubbleRadius = (count: number) => 24 + Math.min(count, 5) * 3;

type Users = ReturnType<typeof useStore>["users"];

function PowerMap() {
  const { users, ideas, provinceNotes, me, connections, addProvinceNote } = useStore();
  const { reducedMotion, lowSpec } = useMotionSettings();
  const shouldAnimate = !reducedMotion && !lowSpec;
  const [view, setView] = useState<"map" | "people">("map");
  const [region, setRegion] = useState<Region | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [have, setHave] = useState<string | null>(null);
  const [need, setNeed] = useState<string | null>(null);
  const [gen, setGen] = useState<Generation | null>(null);
  const [openProvince, setOpenProvince] = useState<ProvinceShape | null>(null);

  const activeCount = [region, issue, have, need, gen].filter(Boolean).length;
  const filtersOn = activeCount > 0;
  const clearAll = () => {
    setRegion(null);
    setIssue(null);
    setHave(null);
    setNeed(null);
    setGen(null);
  };

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (!region || u.region === region) &&
          (!issue || u.interests.includes(issue)) &&
          (!have || u.powers_have.includes(have)) &&
          (!need || u.powers_need.includes(need)) &&
          (!gen || u.generation === gen),
      ),
    [users, region, issue, have, need, gen],
  );

  // Everything except the issue filter, so cluster cards can show counts per issue.
  const baseForClusters = useMemo(
    () =>
      users.filter(
        (u) =>
          (!region || u.region === region) &&
          (!have || u.powers_have.includes(have)) &&
          (!need || u.powers_need.includes(need)) &&
          (!gen || u.generation === gen),
      ),
    [users, region, have, need, gen],
  );

  const countByProvince = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((u) => m.set(u.province, (m.get(u.province) ?? 0) + 1));
    return m;
  }, [filtered]);

  const notesByProvince = useMemo(() => {
    const m = new Map<string, number>();
    provinceNotes.forEach((n) => m.set(n.province, (m.get(n.province) ?? 0) + 1));
    return m;
  }, [provinceNotes]);

  const P = useMemo(() => new Map(PROVINCES.map((p) => [p.en, p])), []);

  // Network overlay: your connections (solid) + people you could team up with (dashed).
  const network = useMemo(() => {
    const home = me ? P.get(me.province) : undefined;
    if (!me || !home) return null;
    const isMe = (id: string) => id === "me" || id === me.id;
    const filteredIds = new Set(filtered.map((u) => u.id));
    const byId = new Map(users.map((u) => [u.id, u]));
    const connectedIds = new Set<string>();
    const connected: ProvinceShape[] = [];
    connections.forEach((c) => {
      if (!isMe(c.user_a) && !isMe(c.user_b)) return;
      const otherId = isMe(c.user_a) ? c.user_b : c.user_a;
      connectedIds.add(otherId);
      const other = byId.get(otherId);
      if (!other || !filteredIds.has(other.id)) return;
      const p = P.get(other.province);
      if (p && p.en !== home.en) connected.push(p);
    });
    const pool = filtered.filter(
      (u) => !connectedIds.has(u.id) && u.province !== me.province && !isMe(u.id),
    );
    const suggested = rankMatches(me, pool, 3)
      .filter((m) => m.score > 0)
      .map((m) => P.get(m.user.province))
      .filter((p): p is ProvinceShape => !!p && p.en !== home.en);
    return { home, connected, suggested };
  }, [me, P, filtered, users, connections]);

  const listProvinces = useMemo(
    () =>
      PROVINCES.filter(
        (p) => (countByProvince.get(p.en) ?? 0) > 0 || (notesByProvince.get(p.en) ?? 0) > 0,
      ).sort((a, b) => (countByProvince.get(b.en) ?? 0) - (countByProvince.get(a.en) ?? 0)),
    [countByProvince, notesByProvince],
  );

  const maxCount = Math.max(1, ...countByProvince.values());

  return (
    <AppShell
      title="สำรวจ"
      subtitle={`${filtered.length} คน · ${ideas.length} ไอเดีย · ${provinceNotes.length} เรื่องเล่า`}
      action={
        <div
          role="group"
          aria-label="เลือกมุมมอง · Choose view"
          className="flex shrink-0 rounded-full bg-muted p-1 text-sm font-bold"
        >
          {(
            [
              ["map", "แผนที่", "Map", "🗺"],
              ["people", "ผู้คน", "People", "👥"],
            ] as const
          ).map(([v, th, en, emoji]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`tap inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 ${
                view === v ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              {th}
              <span lang="en" className="sr-only">
                {" "}
                · {en}
              </span>
            </button>
          ))}
        </div>
      }
    >
      <ExploreTabs current="map" />
      <div className="core-page core-map">
        <a
          href="/#collective-power"
          className="tap mx-5 mb-5 flex min-h-14 items-center justify-between gap-4 border border-primary bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
        >
          ดูเครือข่ายการเชื่อมต่อ
          <ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </a>
        <details className="core-map-filters core-filter-panel px-5 py-3" open>
          <summary className="core-filter-summary">
            <span>
              <span className="mission-kicker">EXPLORE THE NETWORK</span>
              <strong>เลือกพลังที่อยากเจอ</strong>
            </span>
            <span>
              {activeCount > 0 ? `${activeCount} ตัวกรอง` : "ทุกพลัง"}{" "}
              <span aria-hidden="true">+</span>
            </span>
          </summary>
          <div className="space-y-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="tap inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-xs font-bold"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                ล้างตัวกรอง ({activeCount})
              </button>
            )}
            <FilterRow label="ภาค">
              <Pill active={!region} onClick={() => setRegion(null)}>
                ทั้งหมด
              </Pill>
              {REGIONS.map((r) => (
                <Pill key={r} active={region === r} onClick={() => setRegion(r)}>
                  {REGION_LABEL[r]}
                </Pill>
              ))}
            </FilterRow>
            <FilterRow label="ประเด็น">
              <Pill active={!issue} onClick={() => setIssue(null)}>
                ทั้งหมด
              </Pill>
              {ISSUES.filter((i) => i !== "Other").map((i) => (
                <Pill key={i} active={issue === i} onClick={() => setIssue(i)}>
                  {issueTh(i)}
                </Pill>
              ))}
            </FilterRow>
            <FilterRow label="มีพลัง">
              <Pill active={!have} onClick={() => setHave(null)}>
                ทั้งหมด
              </Pill>
              {POWERS.map((p) => (
                <Pill key={p.key} active={have === p.key} onClick={() => setHave(p.key)}>
                  <span aria-hidden="true">{p.emoji}</span> {p.th}
                </Pill>
              ))}
            </FilterRow>
            <FilterRow label="ต้องการ">
              <Pill active={!need} onClick={() => setNeed(null)}>
                ทั้งหมด
              </Pill>
              {POWERS.map((p) => (
                <Pill key={p.key} active={need === p.key} onClick={() => setNeed(p.key)}>
                  <span aria-hidden="true">{p.emoji}</span> {p.th}
                </Pill>
              ))}
            </FilterRow>
            <FilterRow label="รุ่น">
              <Pill active={!gen} onClick={() => setGen(null)}>
                ทั้งหมด
              </Pill>
              {(Object.keys(GENERATION_TH) as Generation[]).map((g) => (
                <Pill key={g} active={gen === g} onClick={() => setGen(g)}>
                  {GENERATION_TH[g]}
                </Pill>
              ))}
            </FilterRow>
          </div>
        </details>

        {filtered.length === 0 && (
          <div
            role="status"
            className="core-map-no-results mission-empty mx-5 mb-3 p-4 text-center"
          >
            <p className="text-sm font-extrabold">ไม่พบคนที่ตรงตัวกรอง ลองเลือกให้กว้างขึ้น</p>
            <button
              type="button"
              onClick={clearAll}
              className="tap mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-bold"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}

        {view === "map" ? (
          <div className="core-map-layout px-5 pb-6">
            <div
              className="core-map-stage relative overflow-hidden rounded-3xl border border-border p-2"
              style={{ backgroundImage: "var(--gradient-soft)" }}
            >
              <div className="core-map-stage-label">
                <span className="mission-kicker">THAILAND / POWER NETWORK</span>
                <span>{filtered.length} คน</span>
              </div>
              <svg
                viewBox={MAP_VIEWBOX}
                className="h-auto w-full"
                role="group"
                aria-label="แผนที่ประเทศไทยรายจังหวัด"
                aria-describedby="province-list-hint"
              >
                {PROVINCES.map((p) => {
                  const count = countByProvince.get(p.en) ?? 0;
                  const dim = !!region && region !== "Nationwide" && p.region !== region;
                  const intensity = count ? 0.25 + (count / maxCount) * 0.6 : 0.07;
                  return (
                    <path
                      key={p.en}
                      d={p.d}
                      onClick={() => setOpenProvince(p)}
                      fill={REGION_FILL[p.region]}
                      fillOpacity={dim ? 0.05 : intensity}
                      stroke="var(--color-background)"
                      strokeWidth={1.6}
                      className="cursor-pointer transition-opacity"
                      aria-hidden="true"
                    />
                  );
                })}

                {network && (
                  <g aria-hidden="true" pointerEvents="none">
                    {network.connected.map((p) => (
                      <line
                        key={`c-${p.en}`}
                        x1={network.home.cx}
                        y1={network.home.cy}
                        x2={p.cx}
                        y2={p.cy}
                        stroke="var(--color-primary)"
                        strokeWidth={3}
                        strokeOpacity={0.55}
                        strokeLinecap="round"
                      />
                    ))}
                    {network.suggested.map((p, i) => (
                      <line
                        key={`s-${p.en}-${i}`}
                        x1={network.home.cx}
                        y1={network.home.cy}
                        x2={p.cx}
                        y2={p.cy}
                        stroke="var(--color-coral)"
                        strokeWidth={3}
                        strokeOpacity={0.6}
                        strokeLinecap="round"
                        strokeDasharray="10 14"
                        className={shouldAnimate ? "animate-dash" : undefined}
                        style={shouldAnimate ? { animationDelay: `${i * 0.6}s` } : undefined}
                      />
                    ))}
                    <circle
                      cx={network.home.cx}
                      cy={network.home.cy}
                      r={44}
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth={4}
                      className={shouldAnimate ? "animate-pulse-node" : undefined}
                      style={{
                        transformOrigin: `${network.home.cx}px ${network.home.cy}px`,
                        transformBox: "view-box",
                      }}
                    />
                  </g>
                )}

                {PROVINCES.filter((p) => (countByProvince.get(p.en) ?? 0) > 0).map((p) => {
                  const c = countByProvince.get(p.en) ?? 0;
                  const r = bubbleRadius(c);
                  return (
                    <g key={`m-${p.en}`}>
                      <circle
                        cx={p.cx}
                        cy={p.cy}
                        r={Math.min(r * 1.8, r + 18)}
                        fill="var(--color-primary)"
                        fillOpacity={0.15}
                        pointerEvents="none"
                        aria-hidden="true"
                      />
                      <g
                        role="button"
                        tabIndex={0}
                        aria-label={`${p.th} · ${c} คน · แตะเพื่อดูว่าใครอยู่ที่นี่`}
                        onClick={() => setOpenProvince(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenProvince(p);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={p.cx}
                          cy={p.cy}
                          r={r}
                          fill="var(--color-primary)"
                          stroke="var(--color-card)"
                          strokeWidth={4}
                        />
                        <text
                          x={p.cx}
                          y={p.cy + 11}
                          textAnchor="middle"
                          fontSize={32}
                          fontWeight={800}
                          fill="var(--color-primary-foreground)"
                          aria-hidden="true"
                        >
                          {c}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {PROVINCES.filter((p) => (notesByProvince.get(p.en) ?? 0) > 0).map((p) => {
                  const c = countByProvince.get(p.en) ?? 0;
                  const bubbleR = c > 0 ? bubbleRadius(c) : 0;
                  return (
                    <circle
                      key={`n-${p.en}`}
                      cx={p.cx + bubbleR * 0.7 + 10}
                      cy={p.cy - bubbleR * 0.7 - 10}
                      r={12}
                      fill="var(--color-coral)"
                      stroke="var(--color-card)"
                      strokeWidth={3}
                      pointerEvents="none"
                      aria-hidden="true"
                    />
                  );
                })}

                {network && (
                  <text
                    x={network.home.cx}
                    y={network.home.cy - 54}
                    textAnchor="middle"
                    fontSize={34}
                    fontWeight={800}
                    fill="var(--color-primary)"
                    stroke="var(--color-background)"
                    strokeWidth={8}
                    paintOrder="stroke"
                    pointerEvents="none"
                    aria-hidden="true"
                  >
                    คุณ
                  </text>
                )}
              </svg>
              <p className="px-2 pb-1 pt-2 text-center text-xs text-muted-foreground">
                แตะจังหวัดเพื่อดูคนและงานในพื้นที่
              </p>
            </div>

            <aside className="core-map-aside">
              {me ? (
                network && (
                  <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <svg width="28" height="8" aria-hidden="true" className="shrink-0">
                        <line
                          x1="2"
                          y1="4"
                          x2="26"
                          y2="4"
                          stroke="var(--color-primary)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>เส้นทึบ = เชื่อมแล้ว</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg width="28" height="8" aria-hidden="true" className="shrink-0">
                        <line
                          x1="2"
                          y1="4"
                          x2="26"
                          y2="4"
                          stroke="var(--color-coral)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="5 5"
                        />
                      </svg>
                      <span>เส้นประ = คู่พลังที่แนะนำ</span>
                    </li>
                  </ul>
                )
              ) : (
                <Link
                  to="/onboarding"
                  className="tap mt-3 flex min-h-11 items-center justify-center rounded-2xl border border-dashed border-primary/60 px-4 py-2 text-center text-sm font-bold text-primary"
                >
                  <span>สร้างโปรไฟล์ เพื่อดูคู่พลังของคุณ</span>
                </Link>
              )}

              <div className="core-section-head">
                <div>
                  <p className="mission-kicker">ON THE MAP</p>
                  <h2 className="mt-4 text-sm font-extrabold">จังหวัดที่มีผู้เข้าร่วม</h2>
                </div>
                <span className="core-data-count">
                  {listProvinces.length}
                  <span>จังหวัด</span>
                </span>
              </div>
              <p id="province-list-hint" className="sr-only">
                เลือกจังหวัดจากรายการด้านล่างเพื่อดูว่าใครอยู่ที่นั่น
              </p>
              {listProvinces.length > 0 ? (
                <div className="core-province-list mt-2 flex flex-wrap gap-2">
                  {listProvinces.map((p) => (
                    <button
                      key={p.en}
                      type="button"
                      onClick={() => setOpenProvince(p)}
                      className="tap min-h-11 rounded-full border border-border bg-card px-4 text-sm font-bold"
                    >
                      {p.th} · {countByProvince.get(p.en) ?? 0}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="core-map-empty">
                  <MissionVisual variant="network" className="core-empty-visual" />
                  <p>ยังไม่มีคนในตัวกรองนี้</p>
                  <p className="text-xs text-muted-foreground">
                    เปลี่ยนตัวกรองเพื่อค้นหาพลังในพื้นที่อื่น
                  </p>
                </div>
              )}

              <section aria-labelledby="clusters-h" className="core-clusters mt-4">
                <h2 id="clusters-h" className="mb-2 text-sm font-extrabold">
                  กลุ่มที่กำลังรวมพลัง
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {CLUSTERS.map((c) => {
                    const members = baseForClusters.filter((u) => u.interests.includes(c));
                    const active = issue === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={active}
                        aria-label={`${issueTh(c)} ${members.length} คน`}
                        onClick={() => setIssue(active ? null : c)}
                        className={`card-soft tap min-h-11 rounded-2xl p-3 text-left ${
                          active ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        <p className="text-sm font-extrabold">{issueTh(c)}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{members.length} คน</span>
                          <span aria-hidden="true" className="flex -space-x-2">
                            {members.slice(0, 3).map((u) => (
                              <Avatar key={u.id} user={u} size={24} />
                            ))}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="core-map-legend mt-4 flex flex-wrap gap-1.5">
                {REGIONS.filter((r) => r !== "Nationwide").map((r) => (
                  <Chip key={r} tone="muted">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: REGION_FILL[r] }}
                      aria-hidden
                    />
                    {REGION_LABEL[r]} · {filtered.filter((u) => u.region === r).length}
                  </Chip>
                ))}
                <Chip tone="muted">
                  ทั่วประเทศ · {filtered.filter((u) => u.region === "Nationwide").length}
                </Chip>
              </div>
            </aside>
          </div>
        ) : (
          <div className="core-people-grid grid grid-cols-2 gap-3 px-5 pb-6">
            {filtered.map((u) => (
              <Link
                key={u.id}
                to="/people/$id"
                params={{ id: u.id }}
                className="core-person-card card-soft tap p-3"
              >
                <Avatar user={u} size={44} />
                <p className="mt-2 truncate text-sm font-extrabold">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {provinceTh(u.province)}
                  {GENERATION_TH[u.generation] ? ` · ${GENERATION_TH[u.generation]}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {u.interests.slice(0, 2).map((i) => (
                    <Chip key={i} tone="primary">
                      {issueTh(i)}
                    </Chip>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}

        {openProvince && (
          <ProvinceSheet
            province={openProvince}
            onClose={() => setOpenProvince(null)}
            people={filtered.filter((u) => u.province === openProvince.en)}
            allPeople={users.filter((u) => u.province === openProvince.en)}
            filtersOn={filtersOn}
            notes={provinceNotes.filter((n) => n.province === openProvince.en)}
            onAdd={(title, detail, issues) => {
              addProvinceNote({
                province: openProvince.en,
                author_id: me?.id ?? "guest",
                author_name: me?.name ?? "ผู้เข้าร่วม",
                title,
                detail,
                issues,
              });
              toast.success("แชร์เรื่องเล่าแล้ว ✨", {
                description: `${openProvince.th} · ขอบคุณที่ช่วยเติมพลังให้แผนที่`,
              });
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

function ProvinceSheet({
  province,
  people,
  allPeople,
  filtersOn,
  notes,
  onClose,
  onAdd,
}: {
  province: ProvinceShape;
  people: Users;
  allPeople: Users;
  filtersOn: boolean;
  notes: ReturnType<typeof useStore>["provinceNotes"];
  onClose: () => void;
  onAdd: (title: string, detail: string, issues: string[]) => void;
}) {
  const [form, setForm] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const list = showAll || !filtersOn ? allPeople : people;
  const canShowAll = filtersOn && allPeople.length > list.length;
  const showAllButton = (
    <button
      type="button"
      onClick={() => setShowAll(true)}
      className="tap mt-2 min-h-11 w-full rounded-2xl text-sm font-bold text-primary"
    >
      ดูทุกคนในจังหวัด ({allPeople.length})
    </button>
  );

  return (
    <Drawer
      open
      shouldScaleBackground={false}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DrawerContent
        aria-describedby={undefined}
        className="max-h-[85vh] rounded-t-3xl border-0 bg-card"
      >
        <div className="overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle className="text-xl font-extrabold leading-tight tracking-normal">
                {province.th}
              </DrawerTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {REGION_LABEL[province.region]} · {list.length} คน
                {filtersOn && !showAll ? " ที่ตรงตัวกรอง" : ""} · {notes.length} เรื่องเล่า
              </p>
            </div>
            <button
              type="button"
              aria-label="ปิด"
              onClick={onClose}
              className="tap grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {list.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-extrabold text-muted-foreground">คนในจังหวัดนี้</p>
              <div className="space-y-2">
                {list.map((u) => (
                  <Link
                    key={u.id}
                    to="/people/$id"
                    params={{ id: u.id }}
                    className="tap flex items-center gap-3 rounded-2xl border border-border p-3"
                  >
                    <Avatar user={u} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.organization}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {u.powers_have.slice(0, 1).map((p) => (
                        <PowerChip key={p} name={p} tone="lime" />
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
              {canShowAll && showAllButton}
            </div>
          )}

          {filtersOn && list.length === 0 && allPeople.length > 0 && (
            <div className="mt-4">
              <p className="rounded-2xl bg-muted p-3 text-[13px] text-muted-foreground">
                ไม่พบคนที่ตรงตัวกรองในจังหวัดนี้
              </p>
              {showAllButton}
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-xs font-extrabold text-muted-foreground">
              เรื่องเล่าจากพื้นที่
            </p>
            {notes.length === 0 && (
              <p className="rounded-2xl bg-accent/60 p-3 text-[13px] text-muted-foreground">
                ยังไม่มีเรื่องเล่าจาก{province.th} เริ่มเล่าได้เลย
              </p>
            )}
            <div className="space-y-2">
              {notes.map((n) => (
                <article key={n.id} className="rounded-2xl border border-border p-3">
                  <p className="text-sm font-extrabold">{n.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {n.detail}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {n.issues.map((i) => (
                      <Chip key={i} tone="primary">
                        {issueTh(i)}
                      </Chip>
                    ))}
                    <span className="text-xs text-muted-foreground">โดย {n.author_name}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {form ? (
            <div className="mt-4 space-y-2">
              <label htmlFor="province-note-title" className="block text-xs font-bold">
                ตั้งชื่อเรื่อง
              </label>
              <input
                id="province-note-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น กิจกรรมของกลุ่มเยาวชนอำเภอเมือง"
                className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <label htmlFor="province-note-detail" className="block text-xs font-bold">
                เล่าให้ฟังหน่อย
              </label>
              <textarea
                id="province-note-detail"
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="ใครทำอะไรอยู่ที่นี่ และอยากได้พลังแบบไหนเพิ่ม"
                className="w-full rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {ISSUES.filter((i) => i !== "Other").map((i) => (
                  <Pill
                    key={i}
                    active={issues.includes(i)}
                    onClick={() =>
                      setIssues((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
                    }
                  >
                    {issueTh(i)}
                  </Pill>
                ))}
              </div>
              <button
                type="button"
                disabled={!title.trim() || !detail.trim()}
                onClick={() => {
                  onAdd(title.trim(), detail.trim(), issues);
                  setTitle("");
                  setDetail("");
                  setIssues([]);
                  setForm(false);
                }}
                className="tap flex h-13 w-full items-center justify-center rounded-2xl bg-primary py-4 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
              >
                แชร์เรื่องเล่า
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setForm(true)}
              className="tap mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/60 py-4 text-sm font-extrabold text-primary"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              เล่าเรื่องจาก{province.th}
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-extrabold text-muted-foreground">{label}</span>
      <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`tap inline-flex min-h-11 shrink-0 items-center rounded-full border px-3.5 text-xs font-bold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

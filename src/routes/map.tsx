import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, List, Map as MapIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ExploreTabs } from "@/components/explore-tabs";
import { ChoicePill } from "@/components/choice-pill";
import { Avatar, IssueBlock, PowerIcon, PowerLine } from "@/components/power-bits";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useStore } from "@/lib/store";
import { rankMatches } from "@/lib/matching";
import { useMotionSettings } from "@/lib/motion";
import { ISSUES, POWERS, REGIONS, type Generation, type Region } from "@/lib/types";
import { GENERATION_TH, issueTh, provinceTh, REGION_LABEL } from "@/lib/i18n";
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

/** สีพื้นจังหวัดตามภาค ใช้บล็อกสีของธีมทุ่ง (ความเข้มบอกจำนวนคน) */
const REGION_FILL: Record<Region, string> = {
  North: "var(--color-block-purple)",
  Northeast: "var(--color-block-orange)",
  Central: "var(--color-block-blue)",
  Bangkok: "var(--color-ink)",
  South: "var(--color-block-green)",
  Nationwide: "var(--color-block-teal)",
};

const CLUSTERS = [
  "Youth",
  "Mental Health",
  "Gender Equality",
  "Community Health",
  "Policy",
  "Digital Innovation",
] as const;

/**
 * รัศมีวงกลมนับคน (หน่วย viewBox กว้าง 1000) — บนมือถือ 375px ราว 14–17px
 * ตัวเลขในวงสูง ~20px (fontSize 60 × สเกลแผนที่ ~0.33) จึงต้องให้วงใหญ่พอ
 */
const bubbleRadius = (count: number) => 40 + Math.min(count, 5) * 3;
const BUBBLE_FONT = 60;

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
  const [allProvinces, setAllProvinces] = useState(false);

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

  const shownProvinces = allProvinces ? listProvinces : listProvinces.slice(0, 8);

  return (
    <AppShell
      title="สำรวจ"
      subtitle={`${filtered.length} คน · ${ideas.length} ไอเดีย · ${provinceNotes.length} เรื่องเล่า`}
    >
      <ExploreTabs current="map" />
      <div className="min-w-0 space-y-5 pb-4">
        <section aria-label="มุมมองและตัวกรอง" className="space-y-3">
          <button
            type="button"
            onClick={() => setView(view === "map" ? "people" : "map")}
            className="meadow-btn-secondary tap w-full"
          >
            {view === "map" ? (
              <>
                <List className="h-6 w-6 shrink-0" aria-hidden="true" />
                ดูเป็นรายชื่อ
              </>
            ) : (
              <>
                <MapIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                ดูเป็นแผนที่
              </>
            )}
          </button>

          <div className="meadow-card px-5 py-2">
            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-body text-ink [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">เลือกพลังที่อยากเจอ</span>
                <span className="flex shrink-0 items-center gap-2 text-ink-soft">
                  {activeCount > 0 ? `${activeCount} ตัวกรอง` : "ทุกพลัง"}
                  <ChevronDown
                    className="h-6 w-6 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </span>
              </summary>
              <div className="space-y-5 pb-4 pt-2">
                <FilterRow label="ภาค">
                  <ChoicePill active={!region} onClick={() => setRegion(null)}>
                    ทั้งหมด
                  </ChoicePill>
                  {REGIONS.map((r) => (
                    <ChoicePill key={r} active={region === r} onClick={() => setRegion(r)}>
                      {REGION_LABEL[r]}
                    </ChoicePill>
                  ))}
                </FilterRow>
                <FilterRow label="ประเด็น">
                  <ChoicePill active={!issue} onClick={() => setIssue(null)}>
                    ทั้งหมด
                  </ChoicePill>
                  {ISSUES.filter((i) => i !== "Other").map((i) => (
                    <ChoicePill key={i} active={issue === i} onClick={() => setIssue(i)}>
                      {issueTh(i)}
                    </ChoicePill>
                  ))}
                </FilterRow>
                <FilterRow label="มีพลัง">
                  <ChoicePill active={!have} onClick={() => setHave(null)}>
                    ทั้งหมด
                  </ChoicePill>
                  {POWERS.map((p) => (
                    <ChoicePill key={p.key} active={have === p.key} onClick={() => setHave(p.key)}>
                      <PowerIcon name={p.key} className="h-5 w-5 shrink-0" /> {p.th}
                    </ChoicePill>
                  ))}
                </FilterRow>
                <FilterRow label="ต้องการ">
                  <ChoicePill active={!need} onClick={() => setNeed(null)}>
                    ทั้งหมด
                  </ChoicePill>
                  {POWERS.map((p) => (
                    <ChoicePill key={p.key} active={need === p.key} onClick={() => setNeed(p.key)}>
                      <PowerIcon name={p.key} className="h-5 w-5 shrink-0" /> {p.th}
                    </ChoicePill>
                  ))}
                </FilterRow>
                <FilterRow label="รุ่น">
                  <ChoicePill active={!gen} onClick={() => setGen(null)}>
                    ทั้งหมด
                  </ChoicePill>
                  {(Object.keys(GENERATION_TH) as Generation[]).map((g) => (
                    <ChoicePill key={g} active={gen === g} onClick={() => setGen(g)}>
                      {GENERATION_TH[g]}
                    </ChoicePill>
                  ))}
                </FilterRow>
              </div>
            </details>
            {activeCount > 0 && (
              <div className="border-t border-[#E6E3F2] py-3">
                <button
                  type="button"
                  onClick={clearAll}
                  className="tap inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink px-4 text-body font-semibold text-ink"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                  ล้างตัวกรอง ({activeCount})
                </button>
              </div>
            )}
          </div>
        </section>

        {filtered.length === 0 && (
          <div role="status" className="meadow-card space-y-3 p-5 text-center">
            <p className="text-body font-semibold text-ink">
              ไม่พบคนที่ตรงตัวกรอง ลองเลือกให้กว้างขึ้น
            </p>
            <button type="button" onClick={clearAll} className="meadow-btn-secondary tap w-full">
              ล้างตัวกรอง
            </button>
          </div>
        )}

        {view === "map" ? (
          <>
            <section aria-labelledby="map-h" className="meadow-card bg-sky-soft! p-3">
              <h2 id="map-h" className="px-2 pb-2 font-heading text-lead font-semibold! text-ink">
                ผู้เข้าร่วม {filtered.length} คนทั่วประเทศ
              </h2>
              <svg
                viewBox={MAP_VIEWBOX}
                className="mx-auto h-auto w-full max-w-md"
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
                        stroke="var(--color-block-orange)"
                        strokeWidth={3}
                        strokeOpacity={0.8}
                        strokeLinecap="round"
                        strokeDasharray="10 14"
                        className={shouldAnimate ? "animate-dash" : undefined}
                        style={shouldAnimate ? { animationDelay: `${i * 0.6}s` } : undefined}
                      />
                    ))}
                    <circle
                      cx={network.home.cx}
                      cy={network.home.cy}
                      r={60}
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
                          stroke="#ffffff"
                          strokeWidth={4}
                        />
                        <text
                          x={p.cx}
                          y={p.cy + BUBBLE_FONT * 0.35}
                          textAnchor="middle"
                          fontSize={BUBBLE_FONT}
                          fontWeight={700}
                          fill="#ffffff"
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
                      r={14}
                      fill="var(--color-block-orange)"
                      stroke="#ffffff"
                      strokeWidth={3}
                      pointerEvents="none"
                      aria-hidden="true"
                    />
                  );
                })}

                {network && (
                  <text
                    x={network.home.cx}
                    y={network.home.cy - 74}
                    textAnchor="middle"
                    fontSize={BUBBLE_FONT}
                    fontWeight={700}
                    fill="var(--color-primary)"
                    stroke="var(--color-sky-soft)"
                    strokeWidth={12}
                    paintOrder="stroke"
                    pointerEvents="none"
                    aria-hidden="true"
                  >
                    คุณ
                  </text>
                )}
              </svg>
              <p className="px-2 pt-2 text-center text-body text-ink-soft">
                แตะจังหวัดเพื่อดูคนและงานในพื้นที่
              </p>
            </section>

            {me ? (
              network && (
                <ul className="meadow-card space-y-2 p-4 text-body text-ink-soft">
                  <li className="flex items-center gap-3">
                    <svg width="32" height="8" aria-hidden="true" className="shrink-0">
                      <line
                        x1="2"
                        y1="4"
                        x2="30"
                        y2="4"
                        stroke="var(--color-primary)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>เส้นทึบ = เชื่อมแล้ว</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg width="32" height="8" aria-hidden="true" className="shrink-0">
                      <line
                        x1="2"
                        y1="4"
                        x2="30"
                        y2="4"
                        stroke="var(--color-block-orange)"
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
              <Link to="/onboarding" className="meadow-btn-secondary tap w-full text-center">
                สร้างโปรไฟล์ เพื่อดูคู่พลังของคุณ
              </Link>
            )}

            <section aria-labelledby="provinces-h" className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="provinces-h" className="font-heading text-lead font-semibold! text-ink">
                  จังหวัดที่มีผู้เข้าร่วม
                </h2>
                <span className="shrink-0 text-body text-ink-soft">
                  {listProvinces.length} จังหวัด
                </span>
              </div>
              <p id="province-list-hint" className="sr-only">
                เลือกจังหวัดจากรายการด้านล่างเพื่อดูว่าใครอยู่ที่นั่น
              </p>
              {listProvinces.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {shownProvinces.map((p) => (
                      <button
                        key={p.en}
                        type="button"
                        onClick={() => setOpenProvince(p)}
                        className="tap min-h-12 rounded-full border-2 border-[#C9C6E0] bg-white px-4 py-1 text-body font-semibold text-ink"
                      >
                        {p.th} · {countByProvince.get(p.en) ?? 0}
                      </button>
                    ))}
                  </div>
                  {listProvinces.length > 8 && (
                    <button
                      type="button"
                      aria-expanded={allProvinces}
                      onClick={() => setAllProvinces((v) => !v)}
                      className="meadow-btn-secondary tap w-full"
                    >
                      {allProvinces ? "แสดงน้อยลง" : `ดูทุกจังหวัด (${listProvinces.length})`}
                    </button>
                  )}
                </>
              ) : (
                <div className="meadow-card space-y-1 p-5">
                  <p className="text-body font-semibold text-ink">ยังไม่มีคนในตัวกรองนี้</p>
                  <p className="text-body text-ink-soft">
                    เปลี่ยนตัวกรองเพื่อค้นหาพลังในพื้นที่อื่น
                  </p>
                </div>
              )}
            </section>

            <section aria-labelledby="clusters-h" className="space-y-3">
              <h2 id="clusters-h" className="font-heading text-lead font-semibold! text-ink">
                กลุ่มที่กำลังรวมพลัง
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
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
                      className={`tap flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left text-body ${
                        active ? "border-primary bg-sky-soft" : "border-[#E6E3F2] bg-white"
                      }`}
                    >
                      <span className="font-semibold text-ink">{issueTh(c)}</span>
                      <span className="shrink-0 text-ink-soft">{members.length} คน</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <ul aria-label="สีของแต่ละภาค" className="flex flex-wrap gap-2">
              {REGIONS.filter((r) => r !== "Nationwide").map((r) => (
                <li
                  key={r}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-3 py-1 text-body text-ink ring-1 ring-[#E6E3F2]"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ background: REGION_FILL[r] }}
                    aria-hidden="true"
                  />
                  {REGION_LABEL[r]} · {filtered.filter((u) => u.region === r).length}
                </li>
              ))}
              <li className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-3 py-1 text-body text-ink ring-1 ring-[#E6E3F2]">
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ background: REGION_FILL.Nationwide }}
                  aria-hidden="true"
                />
                ทั่วประเทศ · {filtered.filter((u) => u.region === "Nationwide").length}
              </li>
            </ul>
          </>
        ) : (
          <ul aria-label="รายชื่อผู้เข้าร่วม" className="grid gap-3 sm:grid-cols-2">
            {filtered.map((u) => (
              <li key={u.id}>
                <Link
                  to="/people/$id"
                  params={{ id: u.id }}
                  className="meadow-card tap flex h-full flex-col gap-3 p-4 text-ink"
                >
                  <span className="flex items-center gap-3">
                    <Avatar user={u} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 break-words text-body font-semibold">
                        {u.name}
                      </span>
                      <span className="line-clamp-2 break-words text-body text-ink-soft">
                        {provinceTh(u.province)}
                        {GENERATION_TH[u.generation] ? ` · ${GENERATION_TH[u.generation]}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {u.interests.slice(0, 2).map((i) => (
                      <IssueBlock key={i} issue={i} />
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link to="/dashboard" className="meadow-btn-secondary tap w-full">
          ดูภาพรวมเครือข่ายสด
          <ArrowUpRight className="h-6 w-6 shrink-0" aria-hidden="true" />
        </Link>

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
              toast.success("แชร์เรื่องเล่าแล้ว", {
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
      className="meadow-btn-secondary tap mt-3 w-full"
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
        className="mx-auto max-h-[85vh] max-w-xl rounded-t-3xl border-0 bg-paper text-ink"
      >
        <div className="overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-body">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="font-heading text-title leading-tight font-bold tracking-normal text-ink">
                {province.th}
              </DrawerTitle>
              <p className="mt-1 text-body text-ink-soft">
                {REGION_LABEL[province.region]} · {list.length} คน
                {filtersOn && !showAll ? " ที่ตรงตัวกรอง" : ""} · {notes.length} เรื่องเล่า
              </p>
            </div>
            <button
              type="button"
              aria-label="ปิด"
              onClick={onClose}
              className="tap grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky text-ink"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {list.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-body font-semibold text-ink">คนในจังหวัดนี้</p>
              <div className="space-y-3">
                {list.map((u) => (
                  <Link
                    key={u.id}
                    to="/people/$id"
                    params={{ id: u.id }}
                    className="tap block space-y-2 rounded-2xl border border-[#E6E3F2] bg-white p-3 text-ink"
                  >
                    <span className="flex items-center gap-3">
                      <Avatar user={u} size={48} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 break-words text-body font-semibold">
                          {u.name}
                        </span>
                        <span className="line-clamp-2 break-words text-body text-ink-soft">
                          {u.organization}
                        </span>
                      </span>
                    </span>
                    <PowerLine label="มีพลัง" powers={u.powers_have} />
                  </Link>
                ))}
              </div>
              {canShowAll && showAllButton}
            </div>
          )}

          {filtersOn && list.length === 0 && allPeople.length > 0 && (
            <div className="mt-5">
              <p className="rounded-2xl bg-sky-soft p-4 text-body text-ink">
                ไม่พบคนที่ตรงตัวกรองในจังหวัดนี้
              </p>
              {showAllButton}
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-body font-semibold text-ink">เรื่องเล่าจากพื้นที่</p>
            {notes.length === 0 && (
              <p className="rounded-2xl bg-sky-soft p-4 text-body text-ink">
                ยังไม่มีเรื่องเล่าจาก{province.th} เริ่มเล่าได้เลย
              </p>
            )}
            <div className="space-y-3">
              {notes.map((n) => (
                <article key={n.id} className="rounded-2xl border border-[#E6E3F2] bg-white p-4">
                  <p className="text-body font-semibold text-ink">{n.title}</p>
                  <p className="mt-1 text-body text-ink-soft">{n.detail}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {n.issues.map((i) => (
                      <IssueBlock key={i} issue={i} />
                    ))}
                    <span className="text-body text-ink-soft">โดย {n.author_name}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {form ? (
            <div className="mt-5 space-y-3">
              <label htmlFor="province-note-title" className="block text-body font-semibold">
                ตั้งชื่อเรื่อง
              </label>
              <input
                id="province-note-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น กิจกรรมของกลุ่มเยาวชนอำเภอเมือง"
                className="h-14 w-full rounded-2xl border-2 border-[#8F8BB8] bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft focus:border-primary focus:ring-2 focus:ring-ring"
              />
              <label htmlFor="province-note-detail" className="block text-body font-semibold">
                เล่าให้ฟังหน่อย
              </label>
              <textarea
                id="province-note-detail"
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="ใครทำอะไรอยู่ที่นี่ และอยากได้พลังแบบไหนเพิ่ม"
                className="w-full rounded-2xl border-2 border-[#8F8BB8] bg-white p-4 text-body text-ink outline-none placeholder:text-ink-soft focus:border-primary focus:ring-2 focus:ring-ring"
              />
              <p id="province-note-issues" className="text-body font-semibold">
                ประเด็นที่เกี่ยวข้อง
              </p>
              <div
                role="group"
                aria-labelledby="province-note-issues"
                className="flex flex-wrap gap-2"
              >
                {ISSUES.filter((i) => i !== "Other").map((i) => (
                  <ChoicePill
                    key={i}
                    active={issues.includes(i)}
                    onClick={() =>
                      setIssues((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
                    }
                  >
                    {issueTh(i)}
                  </ChoicePill>
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
                className="meadow-btn-primary tap w-full"
              >
                แชร์เรื่องเล่า
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setForm(true)}
              className="meadow-btn-secondary tap mt-5 w-full"
            >
              <Plus className="h-6 w-6 shrink-0" aria-hidden="true" />
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
    <div role="group" aria-label={label}>
      <p className="mb-2 text-body font-semibold text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

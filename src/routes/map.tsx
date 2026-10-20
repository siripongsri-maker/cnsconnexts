import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Avatar, Chip, PowerChip } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import { ISSUES, POWERS, REGIONS, type Region } from "@/lib/types";
import { issueTh, powerTh, provinceTh, REGION_LABEL } from "@/lib/i18n";
import { MAP_VIEWBOX, PROVINCES, type ProvinceShape } from "@/lib/thailand-geo";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "แผนที่พลัง — คนส. Connexts" },
      {
        name: "description",
        content:
          "แผนที่ประเทศไทยแบ่งภาคและรายจังหวัด ดูว่าใครอยู่จังหวัดไหน และร่วมลงรายละเอียดของจังหวัดคุณได้",
      },
      { property: "og:title", content: "แผนที่พลังประเทศไทย" },
      { property: "og:description", content: "ดูคน ไอเดีย และเรื่องราวรายจังหวัดทั่วประเทศ" },
    ],
  }),
  component: PowerMap,
});

const REGION_FILL: Record<Region, string> = {
  North: "var(--color-primary)",
  Northeast: "var(--color-coral)",
  Central: "var(--color-electric)",
  Bangkok: "var(--color-primary)",
  South: "var(--color-lime)",
  Nationwide: "var(--color-primary)",
};

function PowerMap() {
  const { users, ideas, provinceNotes, me, addProvinceNote } = useStore();
  const [view, setView] = useState<"map" | "people">("map");
  const [region, setRegion] = useState<Region | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [have, setHave] = useState<string | null>(null);
  const [need, setNeed] = useState<string | null>(null);
  const [openProvince, setOpenProvince] = useState<ProvinceShape | null>(null);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (!region || u.region === region) &&
          (!issue || u.interests.includes(issue)) &&
          (!have || u.powers_have.includes(have)) &&
          (!need || u.powers_need.includes(need)),
      ),
    [users, region, issue, have, need],
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

  const maxCount = Math.max(1, ...countByProvince.values());

  return (
    <AppShell
      title="แผนที่พลัง"
      subtitle={`${filtered.length} คน · ${ideas.length} ไอเดีย · ${provinceNotes.length} เรื่องเล่าจากจังหวัด`}
      action={
        <div className="flex shrink-0 rounded-full bg-muted p-1 text-xs font-bold">
          {(
            [
              ["map", "แผนที่"],
              ["people", "รายชื่อ"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`tap rounded-full px-3 py-1.5 ${
                view === v ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-2 px-5 py-3">
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
              {p.emoji} {p.th}
            </Pill>
          ))}
        </FilterRow>
        <FilterRow label="ต้องการ">
          <Pill active={!need} onClick={() => setNeed(null)}>
            ทั้งหมด
          </Pill>
          {POWERS.map((p) => (
            <Pill key={p.key} active={need === p.key} onClick={() => setNeed(p.key)}>
              {p.emoji} {p.th}
            </Pill>
          ))}
        </FilterRow>
      </div>

      {view === "map" ? (
        <div className="px-5 pb-6">
          <div
            className="relative overflow-hidden rounded-3xl border border-border p-2"
            style={{ backgroundImage: "var(--gradient-soft)" }}
          >
            <svg viewBox={MAP_VIEWBOX} className="h-auto w-full" role="img" aria-label="แผนที่ประเทศไทยรายจังหวัด">
              {PROVINCES.map((p) => {
                const count = countByProvince.get(p.en) ?? 0;
                const dim = !!region && p.region !== region;
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
                    aria-label={p.th}
                  >
                    <title>{`${p.th} · ${count} คน`}</title>
                  </path>
                );
              })}
              {PROVINCES.filter((p) => (countByProvince.get(p.en) ?? 0) > 0).map((p) => (
                <g key={`m-${p.en}`} onClick={() => setOpenProvince(p)} className="cursor-pointer">
                  <circle
                    cx={p.cx}
                    cy={p.cy}
                    r={13 + (countByProvince.get(p.en) ?? 0) * 2}
                    fill="var(--color-primary)"
                    fillOpacity={0.9}
                  />
                  <text
                    x={p.cx}
                    y={p.cy + 6}
                    textAnchor="middle"
                    fontSize={16}
                    fontWeight={800}
                    fill="var(--color-primary-foreground)"
                  >
                    {countByProvince.get(p.en)}
                  </text>
                </g>
              ))}
              {PROVINCES.filter((p) => (notesByProvince.get(p.en) ?? 0) > 0).map((p) => (
                <circle
                  key={`n-${p.en}`}
                  cx={p.cx + 16}
                  cy={p.cy - 14}
                  r={6}
                  fill="var(--color-coral)"
                />
              ))}
            </svg>
            <p className="px-2 pb-1 pt-2 text-center text-xs text-muted-foreground">
              แตะที่จังหวัดเพื่อดูรายละเอียดและร่วมเพิ่มข้อมูล
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {REGIONS.filter((r) => r !== "Nationwide").map((r) => (
              <Chip key={r} tone="muted">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: REGION_FILL[r] }}
                  aria-hidden
                />
                {REGION_LABEL[r]} · {filtered.filter((u) => u.region === r).length}
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5 pb-6">
          {filtered.map((u) => (
            <Link key={u.id} to="/people/$id" params={{ id: u.id }} className="card-soft tap p-3">
              <Avatar user={u} size={44} />
              <p className="mt-2 truncate text-sm font-extrabold">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">{provinceTh(u.province)}</p>
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
          people={users.filter((u) => u.province === openProvince.en)}
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
            toast.success("เพิ่มรายละเอียดจังหวัดแล้ว ✨", {
              description: `${openProvince.th} · ขอบคุณที่ร่วมเติมข้อมูล`,
            });
          }}
        />
      )}
    </AppShell>
  );
}

function ProvinceSheet({
  province,
  people,
  notes,
  onClose,
  onAdd,
}: {
  province: ProvinceShape;
  people: ReturnType<typeof useStore>["users"];
  notes: ReturnType<typeof useStore>["provinceNotes"];
  onClose: () => void;
  onAdd: (title: string, detail: string, issues: string[]) => void;
}) {
  const [form, setForm] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [issues, setIssues] = useState<string[]>([]);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-rise max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-extrabold">{province.th}</h3>
            <p className="text-[12px] text-muted-foreground">
              {REGION_LABEL[province.region]} · {people.length} คน · {notes.length} รายละเอียด
            </p>
          </div>
          <button onClick={onClose} className="tap grid h-9 w-9 place-items-center rounded-full bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {people.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              คนในจังหวัดนี้
            </p>
            <div className="space-y-2">
              {people.map((u) => (
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
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            รายละเอียดของจังหวัด
          </p>
          {notes.length === 0 && (
            <p className="rounded-2xl bg-accent/60 p-3 text-[13px] text-muted-foreground">
              ยังไม่มีใครลงรายละเอียดของ{province.th} — คุณเริ่มคนแรกได้เลย
            </p>
          )}
          <div className="space-y-2">
            {notes.map((n) => (
              <article key={n.id} className="rounded-2xl border border-border p-3">
                <p className="text-sm font-extrabold">{n.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{n.detail}</p>
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
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="หัวข้อ เช่น กลุ่มเยาวชนในอำเภอเมือง"
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="เล่ารายละเอียด: มีใครทำอะไรอยู่ในจังหวัดนี้ ต้องการพลังแบบไหนเพิ่ม"
              className="w-full rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
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
              disabled={!title.trim() || !detail.trim()}
              onClick={() => {
                onAdd(title.trim(), detail.trim(), issues);
                setTitle("");
                setDetail("");
                setIssues([]);
                setForm(false);
              }}
              className="tap flex h-13 w-full items-center justify-center rounded-2xl gradient-power py-4 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
            >
              บันทึกรายละเอียด
            </button>
          </div>
        ) : (
          <button
            onClick={() => setForm(true)}
            className="tap mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/60 py-4 text-sm font-extrabold text-primary"
          >
            <Plus className="h-4 w-4" />
            เพิ่มรายละเอียดของ{province.th}
          </button>
        )}
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-extrabold text-muted-foreground">{label}</span>
      <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">{children}</div>
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
      onClick={onClick}
      className={`tap shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

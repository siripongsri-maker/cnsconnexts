import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Avatar, Chip, PowerChip } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import { ISSUES, POWERS, REGIONS, type Region } from "@/lib/types";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Power Map — Connecting Power" },
      {
        name: "description",
        content: "Browse participants across Thailand by region, issue and the power they bring.",
      },
      { property: "og:title", content: "The Power Map" },
      { property: "og:description", content: "แผนที่พลังของผู้เข้าร่วมทั่วประเทศ" },
    ],
  }),
  component: PowerMap,
});

const REGION_POS: Record<Region, { x: number; y: number }> = {
  North: { x: 34, y: 16 },
  Northeast: { x: 68, y: 30 },
  Central: { x: 40, y: 45 },
  Bangkok: { x: 45, y: 56 },
  South: { x: 38, y: 82 },
  Nationwide: { x: 72, y: 66 },
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h / 997;
}

function PowerMap() {
  const { users, ideas } = useStore();
  const [view, setView] = useState<"map" | "people">("map");
  const [region, setRegion] = useState<Region | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [have, setHave] = useState<string | null>(null);
  const [need, setNeed] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

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

  const nodes = filtered.map((u) => {
    const base = REGION_POS[u.region];
    return {
      u,
      x: base.x + (hash(u.id) - 0.5) * 26,
      y: base.y + (hash(u.name) - 0.5) * 20,
    };
  });

  const sel = selected ? users.find((u) => u.id === selected) : null;
  const clusters = ISSUES.slice(0, 6).map((i) => ({
    issue: i,
    count: users.filter((u) => u.interests.includes(i)).length,
  }));

  return (
    <AppShell
      title="Power Map"
      subtitle={`${filtered.length} people · ${ideas.length} ideas`}
      action={
        <div className="flex shrink-0 rounded-full bg-muted p-1 text-[11px] font-bold">
          {(["map", "people"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`tap rounded-full px-3 py-1.5 capitalize ${
                view === v ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-2 px-5 py-3">
        <FilterRow label="Region">
          <Pill active={!region} onClick={() => setRegion(null)}>
            All
          </Pill>
          {REGIONS.map((r) => (
            <Pill key={r} active={region === r} onClick={() => setRegion(r)}>
              {r}
            </Pill>
          ))}
        </FilterRow>
        <FilterRow label="Issue">
          <Pill active={!issue} onClick={() => setIssue(null)}>
            All
          </Pill>
          {ISSUES.filter((i) => i !== "Other").map((i) => (
            <Pill key={i} active={issue === i} onClick={() => setIssue(i)}>
              {i}
            </Pill>
          ))}
        </FilterRow>
        <FilterRow label="I HAVE">
          <Pill active={!have} onClick={() => setHave(null)}>
            Any
          </Pill>
          {POWERS.map((p) => (
            <Pill key={p.key} active={have === p.key} onClick={() => setHave(p.key)}>
              {p.emoji} {p.key}
            </Pill>
          ))}
        </FilterRow>
        <FilterRow label="I NEED">
          <Pill active={!need} onClick={() => setNeed(null)}>
            Any
          </Pill>
          {POWERS.map((p) => (
            <Pill key={p.key} active={need === p.key} onClick={() => setNeed(p.key)}>
              {p.emoji} {p.key}
            </Pill>
          ))}
        </FilterRow>
      </div>

      {view === "map" ? (
        <div className="px-5 pb-6">
          <div
            className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-border"
            style={{ backgroundImage: "var(--gradient-soft)" }}
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-primary">
              {nodes.map((n, i) =>
                nodes.slice(i + 1).map((m) =>
                  Math.hypot(n.x - m.x, n.y - m.y) < 18 ? (
                    <line
                      key={`${n.u.id}-${m.u.id}`}
                      x1={n.x}
                      y1={n.y}
                      x2={m.x}
                      y2={m.y}
                      stroke="currentColor"
                      strokeWidth={0.25}
                      opacity={0.3}
                    />
                  ) : null,
                ),
              )}
            </svg>
            {nodes.map((n) => (
              <button
                key={n.u.id}
                onClick={() => setSelected(n.u.id)}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
                className="tap absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-card text-lg shadow-md"
                aria-label={n.u.name}
              >
                <span className="grid h-9 w-9 place-items-center">{n.u.avatar}</span>
              </button>
            ))}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 bg-gradient-to-t from-background/90 to-transparent p-3">
              {clusters.map((c) => (
                <Chip key={c.issue} tone="primary">
                  {c.issue} · {c.count}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5 pb-6">
          {filtered.map((u) => (
            <Link
              key={u.id}
              to="/people/$id"
              params={{ id: u.id }}
              className="card-soft tap p-3"
            >
              <Avatar user={u} size={44} />
              <p className="mt-2 truncate text-sm font-extrabold">{u.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{u.province}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {u.interests.slice(0, 2).map((i) => (
                  <Chip key={i} tone="primary">
                    {i}
                  </Chip>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      {sel && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-ink/40 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="animate-rise w-full rounded-t-3xl bg-card p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-start gap-3">
              <Avatar user={sel} size={56} />
              <div className="min-w-0">
                <h3 className="truncate text-lg font-extrabold">{sel.name}</h3>
                <p className="truncate text-[12px] text-muted-foreground">
                  {sel.province} · {sel.organization}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">{sel.bio}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sel.powers_have.map((p) => (
                <PowerChip key={p} name={p} tone="lime" />
              ))}
            </div>
            <Link
              to="/people/$id"
              params={{ id: sel.id }}
              className="tap mt-4 flex h-12 items-center justify-center rounded-2xl gradient-power text-sm font-extrabold text-primary-foreground"
            >
              View Profile
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
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
      className={`tap shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

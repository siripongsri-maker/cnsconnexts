import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MatchCard } from "@/components/match-card";
import { rankMatches } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { ISSUES } from "@/lib/types";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "People You Should Meet — Connecting Power" },
      {
        name: "description",
        content: "Your power matches for today, ranked by shared issues and complementary power.",
      },
      { property: "og:title", content: "People You Should Meet Today" },
      { property: "og:description", content: "คนที่คุณควรเจอวันนี้" },
    ],
  }),
  component: Matches,
});

function Matches() {
  const { me, users, hydrated } = useStore();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !me) navigate({ to: "/onboarding" });
  }, [hydrated, me, navigate]);

  const matches = useMemo(() => {
    if (!me) return [];
    const all = rankMatches(me, users, 20);
    return issue ? all.filter((m) => m.user.interests.includes(issue)) : all;
  }, [me, users, issue]);

  if (!me) {
    return (
      <AppShell title="My Power Matches">
        <p className="p-6 text-sm text-muted-foreground">Loading your matches…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="People You Should Meet"
      subtitle="คนที่คุณควรเจอวันนี้"
      action={
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent text-xl">
          {me.avatar}
        </span>
      }
    >
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-5 py-3">
        <FilterPill active={!issue} onClick={() => setIssue(null)}>
          All
        </FilterPill>
        {ISSUES.filter((i) => i !== "Other").map((i) => (
          <FilterPill key={i} active={issue === i} onClick={() => setIssue(i)}>
            {i}
          </FilterPill>
        ))}
      </div>

      <div className="space-y-3 px-5 pb-6">
        {matches.length === 0 && (
          <p className="card-soft p-6 text-center text-sm text-muted-foreground">
            No one here yet under this filter. Try another issue.
          </p>
        )}
        {matches.map((m, i) => (
          <MatchCard key={m.user.id} match={m} index={i} />
        ))}
      </div>
    </AppShell>
  );
}

function FilterPill({
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
      className={`tap shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-bold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

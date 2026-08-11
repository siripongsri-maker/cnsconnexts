import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useState } from "react";
import type { MatchResult } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { Avatar, Chip, PowerChip, ScoreRing } from "./power-bits";

export function MatchCard({ match, index = 0 }: { match: MatchResult; index?: number }) {
  const { connect, connections } = useStore();
  const u = match.user;
  const existing = connections.find(
    (c) => (c.user_a === "me" && c.user_b === u.id) || (c.user_b === "me" && c.user_a === u.id),
  );
  const [burst, setBurst] = useState(false);

  return (
    <article
      className="card-soft animate-rise relative overflow-hidden p-4"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <Avatar user={u} size={54} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-extrabold">{u.name}</h3>
          <p className="truncate text-[12px] text-muted-foreground">
            {u.province} · {u.organization}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {u.interests.slice(0, 3).map((i) => (
              <Chip key={i} tone="primary">
                {i}
              </Chip>
            ))}
          </div>
        </div>
        <ScoreRing score={match.score} />
      </div>

      <p className="mt-3 rounded-xl bg-accent/60 p-3 text-[13px] leading-relaxed text-accent-foreground">
        {match.reason}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            They bring
          </p>
          <div className="flex flex-wrap gap-1.5">
            {match.theyBring.map((p) => (
              <PowerChip key={p} name={p} tone="lime" />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            They need
          </p>
          <div className="flex flex-wrap gap-1.5">
            {match.theyNeed.map((p) => (
              <PowerChip key={p} name={p} tone="coral" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {existing ? (
          <Link
            to="/connection/$id"
            params={{ id: existing.id }}
            className="tap inline-flex h-11 items-center justify-center rounded-xl bg-lime px-4 text-sm font-bold text-lime-foreground"
          >
            Connected ✨
          </Link>
        ) : (
          <button
            onClick={() => {
              const c = connect(u.id, match.score, match.reason);
              setBurst(true);
              setTimeout(() => setBurst(false), 1200);
              toast.success("New Connection Created ✨", {
                description: `You and ${u.name} are now connected.`,
                action: { label: "Next step", onClick: () => (window.location.href = `/connection/${c.id}`) },
              });
            }}
            className="tap inline-flex h-11 items-center justify-center rounded-xl gradient-power px-4 text-sm font-bold text-primary-foreground"
          >
            Connect
          </button>
        )}
        <Link
          to="/people/$id"
          params={{ id: u.id }}
          className="tap inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-bold"
        >
          View Profile
        </Link>
      </div>

      {burst && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="animate-pop flex items-center gap-2">
            <span className="h-4 w-4 rounded-full bg-primary animate-pulse-node" />
            <span className="h-0.5 w-16 gradient-power" />
            <span className="h-4 w-4 rounded-full bg-coral animate-pulse-node" />
          </div>
        </div>
      )}
    </article>
  );
}

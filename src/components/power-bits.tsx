import type { ReactNode } from "react";
import { POWER_EMOJI, type User } from "@/lib/types";
import { powerTh } from "@/lib/i18n";

export function Chip({
  children,
  tone = "muted",
  className = "",
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "coral" | "electric" | "lime";
  className?: string;
}) {
  const tones: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    coral: "bg-coral/12 text-coral",
    electric: "bg-electric/12 text-electric",
    lime: "bg-lime/25 text-lime-foreground",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function PowerChip({ name, tone = "muted" }: { name: string; tone?: "muted" | "primary" | "coral" | "electric" | "lime" }) {
  return (
    <Chip tone={tone}>
      <span aria-hidden>{POWER_EMOJI[name] ?? "✨"}</span>
      {powerTh(name)}
    </Chip>
  );
}

export function Avatar({
  user,
  size = 48,
}: {
  user: Pick<User, "avatar" | "name"> & { photo?: string };
  size?: number;
}) {
  if (user.photo) {
    return (
      <img
        src={user.photo}
        alt={user.name}
        className="shrink-0 rounded-2xl border border-border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-2xl border border-border bg-accent"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      {user.avatar || user.name.slice(0, 1)}
    </span>
  );
}

export function ScoreRing({ score }: { score: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-2xl gradient-power px-3 py-2 text-primary-foreground">
      <span className="text-lg font-extrabold leading-none">{score}%</span>
      <span className="text-[9px] font-bold uppercase tracking-widest opacity-90">แมตช์</span>
    </div>
  );
}

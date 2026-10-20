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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function PowerChip({
  name,
  tone = "muted",
}: {
  name: string;
  tone?: "muted" | "primary" | "coral" | "electric" | "lime";
}) {
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
  user: Pick<User, "avatar" | "name"> & { photo?: string | undefined };
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
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      role="img"
      aria-label={`แมตช์ ${pct}%`}
      className="relative grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(from -90deg, oklch(0.51 0.25 296), oklch(0.62 0.2 250) ${pct * 0.6}%, oklch(0.68 0.19 25) ${pct}%, var(--muted) ${pct}% 100%)`,
        boxShadow: "0 8px 24px -10px oklch(0.51 0.25 296 / 0.7)",
      }}
    >
      <div className="grid h-[56px] w-[56px] place-items-center rounded-full bg-card text-center">
        <span aria-hidden className="font-tech text-lg font-bold leading-none text-gradient">
          {pct}%
        </span>
        <span aria-hidden className="-mt-2 text-[10px] font-bold text-muted-foreground">
          แมตช์
        </span>
      </div>
    </div>
  );
}

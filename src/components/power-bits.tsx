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
    coral: "bg-coral/12 text-coral-ink",
    electric: "bg-electric/12 text-electric-ink",
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

/** name = คีย์พลังภาษาอังกฤษ (เช่น "Community Network") เพื่อให้หาไอคอนเจอ */
export function PowerChip({
  name,
  tone = "muted",
  canHelp = false,
}: {
  name: string;
  tone?: "muted" | "primary" | "coral" | "electric" | "lime";
  canHelp?: boolean;
}) {
  return (
    <Chip tone={tone}>
      <span aria-hidden>{POWER_EMOJI[name] ?? "✨"}</span>
      {powerTh(name)}
      {canHelp && (
        <>
          <span aria-hidden className="font-bold">
            ✓
          </span>
          <span className="sr-only">คุณช่วยได้ (you can help)</span>
        </>
      )}
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
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div
        role="img"
        aria-label={`แมตช์พลัง ${pct}%, Power Match`}
        className="relative grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(from -90deg, oklch(0.51 0.25 296), oklch(0.62 0.2 250) ${pct * 0.6}%, oklch(0.68 0.19 25) ${pct}%, var(--muted) ${pct}% 100%)`,
          boxShadow: "0 8px 24px -10px oklch(0.51 0.25 296 / 0.7)",
        }}
      >
        <div className="flex h-[56px] w-[56px] flex-col items-center justify-center rounded-full bg-card text-center">
          <span aria-hidden className="font-tech text-lg font-bold leading-none text-gradient">
            {pct}%
          </span>
          <span aria-hidden className="text-xs font-bold text-muted-foreground">
            แมตช์
          </span>
        </div>
      </div>
      <span
        aria-hidden
        lang="en"
        className="whitespace-nowrap font-tech text-xs font-bold text-primary"
      >
        POWER MATCH
      </span>
    </div>
  );
}

/** แอนิเมชันสองจุดเชื่อมกันหลังกด "เชื่อมต่อ" — วางในกล่องที่เป็น relative */
export function ConnectBurst({ name }: { name: string }) {
  const nodeStyle = { transformBox: "fill-box", transformOrigin: "center" } as const;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/75 backdrop-blur-sm"
    >
      <div className="animate-pop grid place-items-center gap-2 px-4 text-center">
        <svg width="120" height="24" viewBox="0 0 120 24" aria-hidden>
          <line
            x1="12"
            y1="12"
            x2="108"
            y2="12"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="200"
            className="animate-draw"
          />
          <circle cx="12" cy="12" r="8" fill="var(--primary)" className="animate-pulse-node" style={nodeStyle} />
          <circle cx="108" cy="12" r="8" fill="var(--coral)" className="animate-pulse-node" style={nodeStyle} />
        </svg>
        <p className="text-sm font-extrabold">เชื่อมกันแล้ว ✨</p>
        <p className="text-xs text-muted-foreground">
          คุณกับ {name} · <span lang="en">New Connection Created</span>
        </p>
      </div>
    </div>
  );
}

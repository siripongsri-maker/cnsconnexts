import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { POWER_EMOJI, type Power, type User } from "@/lib/types";
import { issueTh, powerTh } from "@/lib/i18n";
import { BLOCK_TAG, POWER_ICON, blockFor } from "@/lib/issue-colors";

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
      className={`core-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
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
        className="core-avatar shrink-0 rounded-2xl border border-border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="core-avatar grid shrink-0 place-items-center rounded-2xl border border-border bg-accent"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      {user.avatar || user.name.slice(0, 1)}
    </span>
  );
}

/** แท็กประเด็นสีทึบ — ข้อความตัดบรรทัดได้ ไม่ตัดด้วย … */
export function IssueBlock({ issue }: { issue: string }) {
  const tag = BLOCK_TAG[blockFor(issue)];
  return (
    <span
      className="inline-flex min-h-10 items-center rounded-xl px-3 py-1 text-body font-bold"
      style={{ backgroundColor: tag.bg, color: tag.fg }}
    >
      {issueTh(issue)}
    </span>
  );
}

/** ก้อนเทา "+N" สำหรับประเด็นที่ไม่ได้แสดง */
export function MoreBlock({ count }: { count: number }) {
  return (
    <span className="inline-flex min-h-10 items-center rounded-xl bg-muted px-3 py-1 text-body font-bold text-ink-soft">
      +{count}
    </span>
  );
}

/** ไอคอนของพลัง (คีย์ภาษาอังกฤษ) — ใช้แทนอีโมจิ; คีย์ที่ไม่รู้จักได้ประกายดาว */
export function PowerIcon({
  name,
  className = "h-6 w-6 shrink-0",
}: {
  name: string;
  className?: string;
}) {
  const Icon = POWER_ICON[name as Power] ?? Sparkles;
  return <Icon aria-hidden className={className} />;
}

/**
 * ป้ายพลังสีทึบ + ไอคอน (ตัวอักษรกับพื้นใช้คู่สีป้ายแท็กของธีม) — have = เขียว, need = ส้ม
 * ความหมาย "มีให้/กำลังหา" ต้องบอกด้วยหัวข้อของส่วนนั้นเสมอ ไม่พึ่งสีอย่างเดียว
 */
export function PowerPill({ name, kind }: { name: string; kind: "have" | "need" }) {
  const tag = BLOCK_TAG[kind === "have" ? "green" : "orange"];
  return (
    <span
      className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 py-1 text-body font-semibold"
      style={{ backgroundColor: tag.bg, color: tag.fg }}
    >
      <PowerIcon name={name} className="h-6 w-6 shrink-0" />
      {powerTh(name)}
    </span>
  );
}

/** บรรทัดเดียว: ไอคอนพลังแรก + ชื่อพลัง + " +N" เมื่อมีมากกว่าหนึ่ง */
export function PowerLine({ label, powers }: { label: string; powers: string[] }) {
  const first = powers[0];
  if (first === undefined) return null;
  const Icon = POWER_ICON[first as Power] ?? Sparkles;
  const extra = powers.length - 1;
  return (
    <p className="flex items-center gap-2 text-body text-ink">
      <Icon aria-hidden className="h-6 w-6 shrink-0 text-primary" />
      <span>
        <span className="text-ink-soft">{label} </span>
        <span className="font-semibold">{powerTh(first)}</span>
        {extra > 0 && <span className="text-ink-soft"> +{extra}</span>}
      </span>
    </p>
  );
}

export function ScoreRing({ score, size = 84 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const inner = size - 16;
  return (
    <div
      role="img"
      aria-label={`แมตช์ ${pct}%`}
      className="core-score-ring relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from -90deg, var(--primary) ${pct}%, #E6E3F2 ${pct}% 100%)`,
      }}
    >
      <div
        aria-hidden
        className="flex flex-col items-center justify-center rounded-full bg-card text-center"
        style={{ width: inner, height: inner }}
      >
        <span className="font-heading text-score font-bold text-primary">{pct}%</span>
        <span className="text-body leading-none text-ink-soft">แมตช์</span>
      </div>
    </div>
  );
}

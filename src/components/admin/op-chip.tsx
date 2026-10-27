import { Pencil, Plus, Trash2 } from "lucide-react";

/** Thai words for the database operations shown in the admin backup and audit pages (also used in CSV exports). */
export const OP_TH: Record<string, string> = {
  INSERT: "เพิ่มใหม่",
  UPDATE: "แก้ไข",
  DELETE: "ลบ",
};

/** Operation chips: block colour pair plus a lucide icon, and the Thai word always sits in the chip. */
const OP_TAG: Record<string, { icon: typeof Plus; cls: string }> = {
  INSERT: { icon: Plus, cls: "bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]" },
  UPDATE: { icon: Pencil, cls: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-fg)]" },
  DELETE: { icon: Trash2, cls: "bg-[var(--tag-orange-bg)] text-[var(--tag-orange-fg)]" },
};

export function OpChip({ op, className = "" }: { op: string; className?: string }) {
  const tag = OP_TAG[op];
  const Icon = tag?.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 ${className} ${tag?.cls ?? "bg-muted text-foreground"}`}
    >
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {OP_TH[op] ?? op}
    </span>
  );
}

import type { BlockColor } from "@/lib/issue-colors";

/**
 * Colour = record type, the same on every admin page (logo blocks "สังคม อยู่ ดี มี พลัง").
 * Members purple, connections blue, commitments green, ideas yellow, submissions teal, provinces orange.
 * The sidebar icons use the same map in admin-pages.css (`.admin-nav-link[href=...]`).
 */
export type AdminRecord =
  "member" | "connection" | "commitment" | "idea" | "submission" | "province";

export const RECORD_BLOCK: Record<AdminRecord, BlockColor> = {
  member: "purple",
  connection: "blue",
  commitment: "green",
  idea: "yellow",
  submission: "teal",
  province: "orange",
};

/** Filled chip classes (BLOCK_TAG pair, AA 4.5:1). Literal strings so Tailwind can see them. */
export const RECORD_CHIP: Record<AdminRecord, string> = {
  member: "bg-[var(--tag-purple-bg)] text-[var(--tag-purple-fg)]",
  connection: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-fg)]",
  commitment: "bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]",
  idea: "bg-[var(--tag-yellow-bg)] text-[var(--tag-yellow-fg)]",
  submission: "bg-[var(--tag-teal-bg)] text-[var(--tag-teal-fg)]",
  province: "bg-[var(--tag-orange-bg)] text-[var(--tag-orange-fg)]",
};

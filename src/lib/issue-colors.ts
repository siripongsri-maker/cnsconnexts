import {
  BookOpen,
  Handshake,
  HandCoins,
  Landmark,
  Laptop,
  Lightbulb,
  MapPin,
  Megaphone,
  Palette,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Issue, Power } from "./types";

export type BlockColor = "purple" | "blue" | "yellow" | "green" | "teal" | "orange";

export const ISSUE_BLOCK: Record<Issue, BlockColor> = {
  "LGBTQ+": "purple",
  "Gender Equality": "purple",
  "Gender-Based Violence": "purple",
  "Human Rights": "purple",
  Policy: "blue",
  "Digital Innovation": "blue",
  "Silver Age": "yellow",
  "Economic Inequality": "yellow",
  Environment: "green",
  "Community Health": "green",
  "Mental Health": "teal",
  "Sexual Health": "teal",
  Youth: "orange",
  Other: "orange",
};

/** Tag colour pairs (background / text). Every pair passes WCAG AA 4.5:1. */
export const BLOCK_TAG: Record<BlockColor, { bg: string; fg: string }> = {
  purple: { bg: "#6A2C91", fg: "#FFFFFF" },
  blue: { bg: "#0F6DB0", fg: "#FFFFFF" },
  yellow: { bg: "#F2B21B", fg: "#2B2878" },
  green: { bg: "#3D7A1C", fg: "#FFFFFF" },
  teal: { bg: "#0C7568", fg: "#FFFFFF" },
  orange: { bg: "#B8520F", fg: "#FFFFFF" },
};

export function blockFor(issue: string): BlockColor {
  return (ISSUE_BLOCK as Record<string, BlockColor | undefined>)[issue] ?? "orange";
}

export const POWER_ICON: Record<Power, LucideIcon> = {
  Ideas: Lightbulb,
  "Community Network": Users,
  Communication: Megaphone,
  "Policy Connection": Landmark,
  "Funding / Resources": HandCoins,
  Knowledge: BookOpen,
  Creativity: Palette,
  Technology: Laptop,
  Partnership: Handshake,
  "Local Knowledge": MapPin,
};

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const n = parseInt(full, 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two hex colours (1 to 21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = luminance(hexA);
  const b = luminance(hexB);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

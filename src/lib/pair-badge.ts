import { BLOCK_TAG, type BlockColor } from "./issue-colors";

export type PairSymbol = "star" | "heart" | "circle" | "triangle" | "square" | "windmill";

export const PAIR_SYMBOLS: readonly PairSymbol[] = [
  "star",
  "heart",
  "circle",
  "triangle",
  "square",
  "windmill",
];

export const PAIR_COLORS: readonly BlockColor[] = [
  "purple",
  "blue",
  "yellow",
  "green",
  "teal",
  "orange",
];

export const COLOR_TH: Record<BlockColor, string> = {
  purple: "ม่วง",
  blue: "ฟ้า",
  yellow: "เหลือง",
  green: "เขียว",
  teal: "เขียวน้ำทะเล",
  orange: "ส้ม",
};

export const SYMBOL_TH: Record<PairSymbol, string> = {
  star: "ดาว",
  heart: "หัวใจ",
  circle: "วงกลม",
  triangle: "สามเหลี่ยม",
  square: "สี่เหลี่ยม",
  windmill: "กังหัน",
};

/** FNV-1a 32-bit */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** สีและสัญลักษณ์ของคู่ (36 แบบ) คำนวณจาก signal_key เดียวกันได้ผลเดียวกันทั้งสองเครื่อง */
export function pairBadge(signalKey: string): {
  color: BlockColor;
  symbol: PairSymbol;
  bg: string;
  fg: string;
} {
  const h = fnv1a(signalKey);
  const color = PAIR_COLORS[h % 6]!;
  const symbol = PAIR_SYMBOLS[Math.floor(h / 6) % 6]!;
  return { color, symbol, bg: BLOCK_TAG[color].bg, fg: BLOCK_TAG[color].fg };
}

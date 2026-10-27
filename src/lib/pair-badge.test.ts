import { describe, expect, it } from "vitest";
import { BLOCK_TAG, contrastRatio } from "./issue-colors";
import { COLOR_TH, PAIR_COLORS, PAIR_SYMBOLS, SYMBOL_TH, pairBadge } from "./pair-badge";

describe("pairBadge", () => {
  it("is deterministic for the same key", () => {
    const key = "0b7e1c3a-5d2f-4a6b-9c1d-7e8f9a0b1c2d";
    expect(pairBadge(key)).toEqual(pairBadge(key));
  });

  it("uses 6 colours x 6 symbols", () => {
    expect(PAIR_COLORS).toHaveLength(6);
    expect(PAIR_SYMBOLS).toHaveLength(6);
    expect([...PAIR_COLORS].sort()).toEqual(Object.keys(BLOCK_TAG).sort());
  });

  it("reaches all 36 combinations across random uuid-like keys", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const b = pairBadge(crypto.randomUUID());
      seen.add(`${b.color}/${b.symbol}`);
    }
    expect(seen.size).toBe(36);
  });

  it("takes bg/fg from BLOCK_TAG", () => {
    const b = pairBadge("some-key");
    expect(b.bg).toBe(BLOCK_TAG[b.color].bg);
    expect(b.fg).toBe(BLOCK_TAG[b.color].fg);
  });

  it("keeps every colour pair at WCAG AA (4.5:1)", () => {
    for (const c of PAIR_COLORS) {
      expect(contrastRatio(BLOCK_TAG[c].bg, BLOCK_TAG[c].fg)).toBeGreaterThanOrEqual(4.5);
    }
    for (let i = 0; i < 200; i++) {
      const b = pairBadge(crypto.randomUUID());
      expect(contrastRatio(b.bg, b.fg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("has Thai names for every colour and symbol", () => {
    for (const c of PAIR_COLORS) expect(COLOR_TH[c]).toBeTruthy();
    for (const s of PAIR_SYMBOLS) expect(SYMBOL_TH[s]).toBeTruthy();
    expect(Object.keys(COLOR_TH).sort()).toEqual([...PAIR_COLORS].sort());
    expect(Object.keys(SYMBOL_TH).sort()).toEqual([...PAIR_SYMBOLS].sort());
  });
});

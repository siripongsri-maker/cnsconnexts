import { describe, expect, it } from "vitest";

import {
  FIND_FLASH_MS,
  FIND_PULSE_MS,
  FIND_STRONG_MS,
  FIND_STRONG_REPEATS,
  FIND_STRONG_TOTAL_MS,
  MAX_FLASH_HZ,
  channelBanner,
  findColors,
  planStrongPulse,
  pulsesPerSecond,
  scaleHex,
} from "./find-mode-state";
import { contrastRatio } from "./issue-colors";
import { PAIR_COLORS, pairBadge } from "./pair-badge";

describe("channelBanner", () => {
  it("shows the reconnect banner only when the channel is lost", () => {
    expect(channelBanner("lost")).toBe("สัญญาณขาดหาย กำลังต่อใหม่…");
    expect(channelBanner("open")).toBeNull();
    expect(channelBanner("connecting")).toBeNull();
  });
});

describe("flash rate (≤ 3 per second)", () => {
  it("computes flashes per second from one cycle length", () => {
    expect(pulsesPerSecond(1000, 1)).toBe(1);
    expect(pulsesPerSecond(500, 4)).toBe(2);
  });

  it("keeps the idle pulse near 1 Hz and the strong pulse at or under 3 Hz", () => {
    expect(pulsesPerSecond(FIND_PULSE_MS, Number.POSITIVE_INFINITY)).toBeCloseTo(1);
    expect(FIND_STRONG_REPEATS).toBe(2);
    expect(FIND_STRONG_TOTAL_MS).toBe(FIND_STRONG_MS * FIND_STRONG_REPEATS);
    expect(pulsesPerSecond(FIND_STRONG_MS, FIND_STRONG_REPEATS)).toBeLessThanOrEqual(MAX_FLASH_HZ);
    expect(MAX_FLASH_HZ).toBe(3);
  });

  it("rejects invalid cycle lengths", () => {
    expect(() => pulsesPerSecond(0, 1)).toThrow();
  });

  it("reduced-motion outline lasts 600 ms", () => {
    expect(FIND_FLASH_MS).toBe(600);
  });
});

describe("planStrongPulse", () => {
  it("starts right away when nothing is running", () => {
    expect(planStrongPulse(null, null, 1000)).toBe(1000);
    expect(planStrongPulse(0, null, FIND_STRONG_TOTAL_MS)).toBe(FIND_STRONG_TOTAL_MS);
  });

  it("waits for the running pulse to finish instead of cutting it short", () => {
    expect(planStrongPulse(1000, null, 1200)).toBe(1000 + FIND_STRONG_TOTAL_MS);
  });

  it("merges pings into the one already waiting", () => {
    expect(planStrongPulse(1000, 1700, 1300)).toBeNull();
  });

  it("never flashes more than 3 times a second, however pings arrive", () => {
    // ปิงถี่สุดจากทั้งสองฝั่ง (กดเอง + อีกฝ่าย) และปิงซ้อนกันในช่วงสั้น
    const pings = [0, 10, 120, 300, 690, 705, 1100, 1110, 1500, 2300, 2310, 2400, 4000];
    let last: number | null = null;
    let pending: number | null = null;
    const starts: number[] = [];
    for (const t of pings) {
      if (pending !== null && pending <= t) {
        starts.push(pending);
        last = pending;
        pending = null;
      }
      const at = planStrongPulse(last, pending, t);
      if (at === null) continue;
      if (at <= t) {
        starts.push(at);
        last = at;
      } else {
        pending = at;
      }
    }
    if (pending !== null) starts.push(pending);

    // ยอดของแต่ละรอบเต้นอยู่กลางรอบ — ระยะห่างระหว่างยอดต้อง ≥ 1/3 วินาที
    const peaks = starts.flatMap((s) =>
      Array.from({ length: FIND_STRONG_REPEATS }, (_, i) => s + FIND_STRONG_MS * (i + 0.5)),
    );
    for (let i = 1; i < peaks.length; i++) {
      expect(peaks[i]! - peaks[i - 1]!).toBeGreaterThanOrEqual(1000 / MAX_FLASH_HZ);
    }
    expect(starts.length).toBeGreaterThan(1);
  });
});

describe("findColors contrast", () => {
  it.each(PAIR_COLORS)("%s: text on the pair colour is at least 4.5:1", (color) => {
    const key = Array.from({ length: 200 }, (_, i) => `k${i}`).find(
      (k) => pairBadge(k).color === color,
    )!;
    const c = findColors(pairBadge(key));
    expect(contrastRatio(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PAIR_COLORS)("%s: the pulse moves the background away from the text", (color) => {
    const key = Array.from({ length: 200 }, (_, i) => `k${i}`).find(
      (k) => pairBadge(k).color === color,
    )!;
    const c = findColors(pairBadge(key));
    const rest = contrastRatio(c.fg, c.bg);
    for (const factor of [c.pulsePeak, c.strongPeak]) {
      expect(contrastRatio(c.fg, scaleHex(c.bg, factor))).toBeGreaterThanOrEqual(rest);
    }
  });

  it("darkens behind white text and lightens behind dark text", () => {
    expect(findColors({ bg: "#6A2C91", fg: "#FFFFFF" }).pulsePeak).toBeLessThan(1);
    expect(findColors({ bg: "#F2B21B", fg: "#2B2878" }).pulsePeak).toBeGreaterThan(1);
  });

  it("scaleHex clamps channels", () => {
    expect(scaleHex("#808080", 0.5)).toBe("#404040");
    expect(scaleHex("#F2B21B", 2)).toBe("#FFFF36");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { watchNotificationClock } from "./notification-clock";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("notification clock", () => {
  function setup() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T06:12:00Z"));
    const win = Object.assign(new EventTarget(), { setInterval, clearInterval });
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    const tick = vi.fn();
    const stop = watchNotificationClock(tick);
    return { win, doc, tick, stop };
  }

  it("refreshes timestamps while the notification list stays open and stops after leaving", () => {
    const { tick, stop } = setup();
    const start = Date.now();
    vi.advanceTimersByTime(30_000);
    expect(tick).toHaveBeenLastCalledWith(start + 30_000);
    expect(tick).toHaveBeenCalledTimes(2);
    stop();
    vi.advanceTimersByTime(60_000);
    expect(tick).toHaveBeenCalledTimes(2);
  });

  it("catches up immediately after returning to a suspended tab", () => {
    const { win, doc, tick, stop } = setup();
    const resumed = Date.now() + 3_600_000;
    vi.setSystemTime(resumed);
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(tick).toHaveBeenLastCalledWith(resumed);
    vi.setSystemTime(resumed + 60_000);
    win.dispatchEvent(new Event("focus"));
    expect(tick).toHaveBeenLastCalledWith(resumed + 60_000);
    stop();
    doc.dispatchEvent(new Event("visibilitychange"));
    win.dispatchEvent(new Event("focus"));
    expect(tick).toHaveBeenCalledTimes(3);
  });
});
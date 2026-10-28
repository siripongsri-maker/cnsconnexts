import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTROL_CHANNEL,
  decodeControl,
  encodeControl,
  publishControl,
  subscribeControl,
} from "./live-control-channel";
import { DEFAULT_CONTROL_STATE, type LiveControlState } from "./live-controls";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("control codec", () => {
  it("round-trips a valid state", () => {
    const s: LiveControlState = {
      speed: "fast",
      view: { kind: "region", group: "south" },
      issue: "water",
      motion: "still",
      bubbles: false,
    };
    expect(decodeControl(encodeControl(s))).toEqual(s);
  });

  it("rejects non-string and bad JSON", () => {
    expect(decodeControl(42)).toBeNull();
    expect(decodeControl("{")).toBeNull();
  });

  it("rejects out-of-range speed", () => {
    expect(decodeControl('{"speed":"warp"}')).toBeNull();
  });

  it("missing fields take defaults", () => {
    expect(decodeControl('{"speed":"fast"}')).toEqual({ ...DEFAULT_CONTROL_STATE, speed: "fast" });
  });
});

describe("channel adapter", () => {
  it("publish falls back to localStorage when BroadcastChannel is missing", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("BroadcastChannel", undefined);
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    publishControl(DEFAULT_CONTROL_STATE);
    expect(store.get(CONTROL_CHANNEL)).toBe(encodeControl(DEFAULT_CONTROL_STATE));
  });

  it("subscribe ignores a malformed storage event and accepts a valid one", () => {
    const target = new EventTarget();
    vi.stubGlobal("BroadcastChannel", undefined);
    vi.stubGlobal("window", {
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    });
    const fire = (key: string, newValue: string) =>
      target.dispatchEvent(Object.assign(new Event("storage"), { key, newValue }));
    const onState = vi.fn();
    const unsubscribe = subscribeControl(onState);
    fire(CONTROL_CHANNEL, "garbage");
    fire("other", encodeControl(DEFAULT_CONTROL_STATE));
    expect(onState).not.toHaveBeenCalled();
    fire(CONTROL_CHANNEL, encodeControl(DEFAULT_CONTROL_STATE));
    expect(onState).toHaveBeenCalledTimes(1);
    unsubscribe();
    fire(CONTROL_CHANNEL, encodeControl(DEFAULT_CONTROL_STATE));
    expect(onState).toHaveBeenCalledTimes(1);
  });
});

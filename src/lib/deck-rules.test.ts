import { describe, expect, it, vi } from "vitest";
import {
  ACTION_LOCK_MS,
  deckPrimaryAction,
  deckState,
  swipeOutcome,
  swipeRotation,
  tryAcquireLock,
  unseenEntries,
} from "./deck-rules";

describe("swipeOutcome", () => {
  it("skips at -90px or further left", () => {
    expect(swipeOutcome(-90)).toBe("skip");
    expect(swipeOutcome(-200)).toBe("skip");
  });
  it("snaps back below the 90px threshold", () => {
    expect(swipeOutcome(-89)).toBe("snap");
    expect(swipeOutcome(0)).toBe("snap");
    expect(swipeOutcome(89)).toBe("snap");
  });
  it("saves at 90px or further right", () => {
    expect(swipeOutcome(90)).toBe("save");
    expect(swipeOutcome(300)).toBe("save");
  });
});

describe("swipeRotation", () => {
  it("tilts dx/10 degrees, clamped to ±12", () => {
    expect(swipeRotation(500)).toBe(12);
    expect(swipeRotation(-500)).toBe(-12);
    expect(swipeRotation(50)).toBe(5);
    expect(swipeRotation(0)).toBe(0);
  });
});

describe("deckPrimaryAction", () => {
  it("asks for a profile first when the viewer has none", () => {
    expect(deckPrimaryAction({ hasProfile: false, connected: false })).toBe("open-profile-sheet");
  });
  it("opens the existing connection instead of connecting twice (Review Focus 3)", () => {
    expect(deckPrimaryAction({ hasProfile: true, connected: true })).toBe("open-connection");
  });
  it("connects when the viewer has a profile and is not yet connected", () => {
    expect(deckPrimaryAction({ hasProfile: true, connected: false })).toBe("connect");
  });
});

describe("deckState (Review Focus 4)", () => {
  it("is loading before hydration with nothing to show", () => {
    expect(deckState({ hydrated: false, networkAvailable: true, total: 0, remaining: 0 })).toBe(
      "loading",
    );
  });
  it("shows the retry state when the network read failed and the pool is empty", () => {
    expect(deckState({ hydrated: true, networkAvailable: false, total: 0, remaining: 0 })).toBe(
      "error",
    );
  });
  it("is empty when every card has been seen", () => {
    expect(deckState({ hydrated: true, networkAvailable: true, total: 5, remaining: 0 })).toBe(
      "empty",
    );
  });
  it("is empty when the network worked but the pool has nobody", () => {
    expect(deckState({ hydrated: true, networkAvailable: true, total: 0, remaining: 0 })).toBe(
      "empty",
    );
  });
  it("is ready as soon as cached cards exist, even before hydration", () => {
    expect(deckState({ hydrated: false, networkAvailable: true, total: 3, remaining: 3 })).toBe(
      "ready",
    );
  });
});

describe("tryAcquireLock (double-tap guard)", () => {
  it("grants the first activation and locks for ACTION_LOCK_MS", () => {
    expect(tryAcquireLock(0, 1000)).toBe(1000 + ACTION_LOCK_MS);
  });
  it("refuses a second primary activation within the lock window, so connect is not called", () => {
    const connect = vi.fn();
    let lockedUntil = 0;
    const press = (now: number) => {
      const next = tryAcquireLock(lockedUntil, now);
      if (next === null) return;
      lockedUntil = next;
      connect();
    };
    press(1000);
    press(1000 + 50);
    press(1000 + ACTION_LOCK_MS - 1);
    expect(connect).toHaveBeenCalledTimes(1);
  });
  it("grants again once the window has passed", () => {
    expect(tryAcquireLock(1300, 1300)).toBe(1300 + ACTION_LOCK_MS);
  });
});

describe("unseenEntries", () => {
  const entry = (id: string, name = `คน ${id}`) => ({ user: { id, name }, match: null });

  it("drops nameless cards and anyone already seen, keeping deck order", () => {
    const entries = [entry("a"), entry("b", "  "), entry("c"), entry("d"), entry("e", "")];
    expect(unseenEntries(entries, ["c"]).map((e) => e.user.id)).toEqual(["a", "d"]);
  });

  it("returns every named card when nothing has been seen", () => {
    expect(unseenEntries([entry("a"), entry("b")], []).map((e) => e.user.id)).toEqual(["a", "b"]);
  });

  it("is empty when everyone has been seen", () => {
    expect(unseenEntries([entry("a"), entry("b")], ["b", "a"])).toEqual([]);
  });
});

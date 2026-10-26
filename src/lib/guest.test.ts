import { describe, expect, it } from "vitest";
import { PARTICIPANT_ID_KEY, hasLocalParticipantId, homeVisitor, isGuest } from "./guest";
import type { User } from "./types";

const me: User = {
  id: "me",
  name: "มะลิ",
  avatar: "✨",
  province: "",
  region: "North",
  organization: "อิสระ",
  generation: "Millennial",
  bio: "",
  interests: ["Youth"],
  powers_have: ["Ideas"],
  powers_need: [],
  created_at: "2026-10-26T00:00:00.000Z",
  source: "direct",
};

describe("isGuest", () => {
  it("is not a guest once the profile is loaded", () => {
    expect(isGuest({ me, hasLocalId: true, hydrated: true })).toBe(false);
  });

  it("is a guest with no profile and no participant id on this device", () => {
    expect(isGuest({ me: null, hasLocalId: false, hydrated: true })).toBe(true);
  });

  it("first-time visitor is a guest straight away, before the store finishes loading", () => {
    expect(isGuest({ me: null, hasLocalId: false, hydrated: false })).toBe(true);
  });

  it("returning participant mid-hydration (id on device, profile not loaded yet) is not a guest", () => {
    expect(isGuest({ me: null, hasLocalId: true, hydrated: false })).toBe(false);
  });

  it("returning participant whose profile still hasn't arrived after hydration is not a guest", () => {
    expect(isGuest({ me: null, hasLocalId: true, hydrated: true })).toBe(false);
  });
});

describe("hasLocalParticipantId", () => {
  const storage = (value: string | null) => ({
    getItem: (k: string) => (k === PARTICIPANT_ID_KEY ? value : null),
  });

  it("reads the store's participant id key", () => {
    expect(PARTICIPANT_ID_KEY).toBe("connexts-participant-id");
    expect(hasLocalParticipantId(storage("4b1c…"))).toBe(true);
  });

  it("is false when the id is missing or empty", () => {
    expect(hasLocalParticipantId(storage(null))).toBe(false);
    expect(hasLocalParticipantId(storage(""))).toBe(false);
  });

  it("is false when storage is blocked (throws)", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(hasLocalParticipantId(blocked)).toBe(false);
  });
});

describe("homeVisitor", () => {
  it("is unknown before mount, whatever the store says (SSR and first client render agree)", () => {
    expect(homeVisitor({ mounted: false, me: null, hasLocalId: false, hydrated: false })).toBe(
      "unknown",
    );
    expect(homeVisitor({ mounted: false, me, hasLocalId: true, hydrated: true })).toBe("unknown");
  });

  it("is a member once the profile is loaded", () => {
    expect(homeVisitor({ mounted: true, me, hasLocalId: true, hydrated: true })).toBe("member");
    expect(homeVisitor({ mounted: true, me, hasLocalId: true, hydrated: false })).toBe("member");
  });

  it("is a guest with no profile and no local id, before or after hydration", () => {
    expect(homeVisitor({ mounted: true, me: null, hasLocalId: false, hydrated: false })).toBe(
      "guest",
    );
    expect(homeVisitor({ mounted: true, me: null, hasLocalId: false, hydrated: true })).toBe(
      "guest",
    );
  });

  it("returning participant mid-hydration waits on the loading deck (Review Focus 2)", () => {
    expect(homeVisitor({ mounted: true, me: null, hasLocalId: true, hydrated: false })).toBe(
      "returning-loading",
    );
  });

  it("returning participant whose profile never arrived is not stuck loading after hydration (Review Focus 4)", () => {
    const v = homeVisitor({ mounted: true, me: null, hasLocalId: true, hydrated: true });
    expect(v).toBe("returning-no-profile");
    expect(v).not.toBe("returning-loading");
    // ...and is still not treated as a guest (no banner)
    expect(v).not.toBe("guest");
  });
});

import { describe, expect, it, vi } from "vitest";

import { inviteReason, notifyAccepted, notifyInvite, selectVisibleCard } from "./meetup-cards";
import type { Meetup } from "./meetup-rules";
import type { User } from "./types";

function meetup(id: string, over: Partial<Meetup> = {}): Meetup {
  return {
    id,
    connectionId: "c1",
    inviter: "a",
    invitee: "b",
    status: "pending",
    signalKey: "k",
    createdAt: "2026-10-27T10:00:00Z",
    respondedAt: null,
    expiresAt: "2026-10-27T10:30:00Z",
    ...over,
  };
}

describe("selectVisibleCard", () => {
  const inv1 = meetup("i1");
  const inv2 = meetup("i2");
  const acc1 = meetup("a1", { status: "accepted" });

  it("returns null while a dialog is open", () => {
    expect(
      selectVisibleCard({ incoming: [inv1], acceptedForMe: [acc1], dialogOpen: true }),
    ).toBeNull();
  });

  it("returns null when there is nothing to show", () => {
    expect(selectVisibleCard({ incoming: [], acceptedForMe: [], dialogOpen: false })).toBeNull();
  });

  it("shows invites before accepted, oldest invite first", () => {
    const card = selectVisibleCard({
      incoming: [inv1, inv2],
      acceptedForMe: [acc1],
      dialogOpen: false,
    });
    expect(card).toEqual({ kind: "invite", meetup: inv1, moreCount: 2 });
  });

  it("falls back to accepted when no invites", () => {
    const card = selectVisibleCard({ incoming: [], acceptedForMe: [acc1], dialogOpen: false });
    expect(card).toEqual({ kind: "accepted", meetup: acc1, moreCount: 0 });
  });

  it("moreCount counts the remaining items across both lists", () => {
    const card = selectVisibleCard({
      incoming: [inv1],
      acceptedForMe: [acc1],
      dialogOpen: false,
    });
    expect(card?.moreCount).toBe(1);
  });
});

describe("notify", () => {
  it("notifyInvite / notifyAccepted play a silent-voice chime", () => {
    const play = vi.fn();
    notifyInvite(play);
    notifyAccepted(play);
    expect(play).toHaveBeenCalledTimes(2);
    expect(play).toHaveBeenCalledWith({ speak: false });
  });

  it("notifyInvite swallows a throwing playConnext", () => {
    const boom = vi.fn(() => {
      throw new Error("audio blocked");
    });
    expect(() => notifyInvite(boom)).not.toThrow();
    expect(() => notifyAccepted(boom)).not.toThrow();
    expect(boom).toHaveBeenCalledTimes(2);
  });
});

describe("inviteReason", () => {
  const base: User = {
    id: "x",
    name: "x",
    avatar: "",
    region: "Central",
    interests: ["health-equity"],
    powers_have: [],
    powers_need: [],
  } as unknown as User;

  it("is null when either profile is missing", () => {
    expect(inviteReason(null, base)).toBeNull();
    expect(inviteReason(base, undefined)).toBeNull();
  });

  it("returns a non-empty sentence when both profiles exist", () => {
    const text = inviteReason(base, { ...base, id: "y" });
    expect(typeof text).toBe("string");
    expect(text!.trim().length).toBeGreaterThan(0);
  });
});

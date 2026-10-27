import { describe, expect, it, vi } from "vitest";

import {
  entryState,
  INVITE_RESULT_TOAST,
  inviteReason,
  inviteSentNote,
  notifyAccepted,
  notifyInvite,
  selectVisibleCard,
} from "./meetup-cards";
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

describe("entryState (หน้าคู่)", () => {
  const now = Date.parse("2026-10-27T10:05:00Z");

  it("no active meetup -> invite", () => {
    expect(entryState([], "c1", "a", now)).toEqual({ kind: "invite" });
    expect(entryState([meetup("m", { status: "done" })], "c1", "a", now)).toEqual({
      kind: "invite",
    });
  });

  it("my own declined invite before expiry still reads as waiting (decline stays private)", () => {
    const declined = meetup("m", { status: "declined", respondedAt: "2026-10-27T10:02:00Z" });
    expect(entryState([declined], "c1", "a", now)).toEqual({ kind: "waiting" });
    const late = Date.parse("2026-10-27T10:30:00Z");
    expect(entryState([declined], "c1", "a", late)).toEqual({ kind: "invite" });
  });

  it("the partner's declined invite to me does not block me (invite allowed)", () => {
    const declined = meetup("m", { status: "declined" });
    expect(entryState([declined], "c1", "b", now)).toEqual({ kind: "invite" });
  });

  it("expired pending/accepted does not block inviting or starting", () => {
    const late = Date.parse("2026-10-27T10:31:00Z");
    expect(entryState([meetup("m", { status: "accepted" })], "c1", "a", late)).toEqual({
      kind: "invite",
    });
  });

  it("accepted active meetup -> start, for inviter and invitee alike", () => {
    const m = meetup("m", { status: "accepted" });
    expect(entryState([m], "c1", "a", now)).toEqual({ kind: "start", meetup: m });
    expect(entryState([m], "c1", "b", now)).toEqual({ kind: "start", meetup: m });
  });

  it("my pending invite -> waiting; an invite waiting for me -> none", () => {
    const m = meetup("m");
    expect(entryState([m], "c1", "a", now)).toEqual({ kind: "waiting" });
    expect(entryState([m], "c1", "b", now)).toEqual({ kind: "none" });
  });

  it("only looks at this connection; no identity -> none", () => {
    expect(entryState([meetup("m", { connectionId: "other" })], "c1", "a", now)).toEqual({
      kind: "invite",
    });
    expect(entryState([], "c1", null, now)).toEqual({ kind: "none" });
  });
});

describe("invite copy", () => {
  it("uses the partner name in the note", () => {
    expect(inviteSentNote("มะลิ")).toBe("ส่งคำชวนเจอแล้ว รอ มะลิ ตอบ");
  });
  it("keeps the three result toasts verbatim", () => {
    expect(INVITE_RESULT_TOAST).toEqual({
      sent: "ส่งคำชวนเจอแล้ว",
      existing: "มีคำชวนที่รออยู่แล้ว",
      failed: "ยังส่งคำชวนเจอไม่สำเร็จ กดชวนใหม่ได้",
    });
  });
});

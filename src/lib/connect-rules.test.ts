import { describe, expect, it } from "vitest";
import { connectionWith, rollbackConnect } from "./connect-rules";
import type { AppNotification, Connection } from "./types";

const conn = (id: string, a: string, b: string, pending = false): Connection => ({
  id,
  user_a: a,
  user_b: b,
  match_score: 80,
  match_reason: "ทำเรื่องเดียวกัน",
  status: "Connected",
  created_at: "2026-10-27T00:00:00Z",
  ...(pending ? { pending: true } : {}),
});

const note = (
  id: string,
  kind: AppNotification["kind"],
  connection_id?: string,
): AppNotification => ({
  id,
  kind,
  title: "",
  body: "",
  from_id: "x",
  from_name: "x",
  connection_id,
  read: false,
  created_at: "2026-10-27T00:00:00Z",
});

describe("connectionWith", () => {
  const list = [conn("c1", "me", "u1"), conn("c2", "u2", "me"), conn("c3", "u3", "u4")];

  it("finds a connection I started", () => {
    expect(connectionWith(list, "u1")?.id).toBe("c1");
  });
  it("finds a connection the other person started", () => {
    expect(connectionWith(list, "u2")?.id).toBe("c2");
  });
  it("ignores connections between other people", () => {
    expect(connectionWith(list, "u3")).toBeUndefined();
    expect(connectionWith(list, "nobody")).toBeUndefined();
  });
});

describe("rollbackConnect", () => {
  it("removes the optimistic connection and its 'sent' notification only", () => {
    const state = {
      connections: [conn("new", "me", "u1", true), conn("old", "me", "u2")],
      notifications: [
        note("n-new", "connect_sent", "new"),
        note("n-old", "connect_sent", "old"),
        note("n-msg", "message", "new"),
      ],
      other: 1,
    };
    const next = rollbackConnect(state, "new");
    expect(next.connections.map((c) => c.id)).toEqual(["old"]);
    expect(next.notifications.map((n) => n.id)).toEqual(["n-old", "n-msg"]);
    expect(next.other).toBe(1);
  });

  it("returns the same state object when there is nothing to roll back", () => {
    const state = { connections: [conn("old", "me", "u2")], notifications: [] };
    expect(rollbackConnect(state, "missing")).toBe(state);
  });
});

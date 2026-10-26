import { describe, expect, it } from "vitest";
import { nextWriteStep, runProfileWrite, type WriteOutcome } from "./profile-write";

describe("nextWriteStep", () => {
  describe("update", () => {
    it("retries as insert when the update matched no row", () => {
      expect(nextWriteStep("update", { error: null, count: 0 })).toBe("retry-as-insert");
    });

    it("is done when at least one row was updated", () => {
      expect(nextWriteStep("update", { error: null, count: 1 })).toBe("done");
      expect(nextWriteStep("update", { error: null, count: 3 })).toBe("done");
    });

    it("keeps today's behaviour when the count is unknown", () => {
      expect(nextWriteStep("update", { error: null, count: null })).toBe("done");
      expect(nextWriteStep("update", { error: null })).toBe("done");
    });

    it("fails on any error, whatever the code", () => {
      expect(nextWriteStep("update", { error: { code: "42501" } })).toBe("fail");
      expect(nextWriteStep("update", { error: {} })).toBe("fail");
      expect(nextWriteStep("update", { error: { code: "23505" } })).toBe("fail");
      expect(nextWriteStep("update", { error: { code: "42501" }, count: 0 })).toBe("fail");
    });
  });

  describe("insert", () => {
    it("is done when there is no error", () => {
      expect(nextWriteStep("insert", { error: null })).toBe("done");
      expect(nextWriteStep("insert", { error: null, count: null })).toBe("done");
    });

    it("retries as update when the row already exists (duplicate key)", () => {
      expect(nextWriteStep("insert", { error: { code: "23505" } })).toBe("retry-as-update");
    });

    it("fails on any other error", () => {
      expect(nextWriteStep("insert", { error: { code: "42501" } })).toBe("fail");
      expect(nextWriteStep("insert", { error: {} })).toBe("fail");
    });

    it("does not treat count 0 on an insert as a problem", () => {
      expect(nextWriteStep("insert", { error: null, count: 0 })).toBe("done");
    });
  });
});

function ops(insert: WriteOutcome[], update: WriteOutcome[]) {
  const calls: string[] = [];
  const take = (name: string, queue: WriteOutcome[]) => async () => {
    calls.push(name);
    const next = queue.shift();
    if (!next) throw new Error(`unexpected ${name}`);
    return next;
  };
  return { calls, insert: take("insert", insert), update: take("update", update) };
}

describe("runProfileWrite", () => {
  it("succeeds with a single call when the first write lands", async () => {
    const o = ops([], [{ error: null, count: 1 }]);
    expect(await runProfileWrite("update", o)).toEqual({ ok: true });
    expect(o.calls).toEqual(["update"]);
  });

  it("re-inserts once when the update matched no row", async () => {
    const o = ops([{ error: null }], [{ error: null, count: 0 }]);
    expect(await runProfileWrite("update", o)).toEqual({ ok: true });
    expect(o.calls).toEqual(["update", "insert"]);
  });

  it("fails with insert mode when the re-insert errors", async () => {
    const boom = { code: "42501" };
    const o = ops([{ error: boom }], [{ error: null, count: 0 }]);
    expect(await runProfileWrite("update", o)).toEqual({ ok: false, mode: "insert", error: boom });
    expect(o.calls).toEqual(["update", "insert"]);
  });

  it("does not loop when the re-insert hits a duplicate key", async () => {
    const dup = { code: "23505" };
    const o = ops([{ error: dup }], [{ error: null, count: 0 }]);
    expect(await runProfileWrite("update", o)).toEqual({ ok: false, mode: "insert", error: dup });
    expect(o.calls).toEqual(["update", "insert"]);
  });

  it("updates once when the insert hits a duplicate key", async () => {
    const o = ops([{ error: { code: "23505" } }], [{ error: null, count: 1 }]);
    expect(await runProfileWrite("insert", o)).toEqual({ ok: true });
    expect(o.calls).toEqual(["insert", "update"]);
  });

  it("fails when the retry update still matches no row", async () => {
    const o = ops([{ error: { code: "23505" } }], [{ error: null, count: 0 }]);
    const result = await runProfileWrite("insert", o);
    expect(result).toMatchObject({ ok: false, mode: "update" });
    expect(o.calls).toEqual(["insert", "update"]);
  });

  it("fails with update mode when the retry update errors", async () => {
    const boom = { code: "PGRST301" };
    const o = ops([{ error: { code: "23505" } }], [{ error: boom }]);
    expect(await runProfileWrite("insert", o)).toEqual({ ok: false, mode: "update", error: boom });
  });

  it("does not retry other errors and keeps the original mode", async () => {
    const boom = { code: "42501" };
    const o = ops([], [{ error: boom }]);
    expect(await runProfileWrite("update", o)).toEqual({ ok: false, mode: "update", error: boom });
    expect(o.calls).toEqual(["update"]);
  });

  it("treats a thrown write (e.g. network) as a failure in the current mode", async () => {
    const o = {
      insert: async () => {
        throw new Error("offline");
      },
      update: async () => ({ error: null, count: 1 }),
    };
    const result = await runProfileWrite("insert", o);
    expect(result).toMatchObject({ ok: false, mode: "insert" });
  });
});

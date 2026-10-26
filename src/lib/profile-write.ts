export type WriteMode = "insert" | "update";

export type WriteOutcome = {
  error: { code?: string } | null;
  count?: number | null;
};

export type WriteStep = "done" | "retry-as-insert" | "retry-as-update" | "fail";

/** รหัส Postgres: unique_violation (แถวนี้มีอยู่แล้ว) */
const DUPLICATE_KEY = "23505";

/**
 * ตัดสินว่าหลังเขียนโปรไฟล์ขึ้นฐานข้อมูลแล้วควรทำอะไรต่อ (ฟังก์ชันล้วน ไม่แตะฐานข้อมูล)
 * - update ที่ไม่ error แต่ไม่โดนแถวเลย (count === 0) แปลว่าแถวหาย → insert ใหม่
 * - insert ที่ชน duplicate key แปลว่ารอบก่อนเขียนสำเร็จแต่ไคลเอนต์ไม่เห็น → update แทน
 * - count ที่ไม่รู้ค่า (null/undefined) ถือว่าสำเร็จเหมือนเดิม ไม่เดา
 */
export function nextWriteStep(mode: WriteMode, outcome: WriteOutcome): WriteStep {
  const { error, count } = outcome;
  if (error) {
    return mode === "insert" && error.code === DUPLICATE_KEY ? "retry-as-update" : "fail";
  }
  if (mode === "update" && count === 0) return "retry-as-insert";
  return "done";
}

export type ProfileWriteOps = {
  insert: () => PromiseLike<WriteOutcome>;
  update: () => PromiseLike<WriteOutcome>;
};

export type ProfileWriteResult =
  | { ok: true }
  /** mode = แถวน่าจะอยู่ในสถานะไหนตอนล้มเหลว ใช้เป็น mode ของรายการที่ค้างรอซิงก์ */
  | { ok: false; mode: WriteMode; error: unknown };

async function attempt(op: () => PromiseLike<WriteOutcome>): Promise<WriteOutcome> {
  try {
    return await op();
  } catch (error) {
    return { error: error as { code?: string } };
  }
}

/**
 * เขียนโปรไฟล์ตาม mode แล้วลองใหม่ "สูงสุดหนึ่งครั้ง" ตาม nextWriteStep (ไม่วนซ้ำ)
 * ผลของรอบที่สองเป็นตัวตัดสินว่าสำเร็จหรือล้มเหลว
 */
export async function runProfileWrite(
  mode: WriteMode,
  ops: ProfileWriteOps,
): Promise<ProfileWriteResult> {
  const first = await attempt(ops[mode]);
  const step = nextWriteStep(mode, first);
  if (step === "done") return { ok: true };
  if (step === "fail") return { ok: false, mode, error: first.error };

  const retryMode: WriteMode = step === "retry-as-insert" ? "insert" : "update";
  const second = await attempt(ops[retryMode]);
  if (nextWriteStep(retryMode, second) === "done") return { ok: true };
  return {
    ok: false,
    mode: retryMode,
    error: second.error ?? new Error("profile row not found after retry"),
  };
}

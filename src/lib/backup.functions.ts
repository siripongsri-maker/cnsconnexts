import { createServerFn } from "@tanstack/react-start";

/** ระบบสำรองข้อมูลอัตโนมัติ — อ่าน/กู้คืนสแนปช็อตจากตาราง data_backups (ต้องใช้รหัสผู้ดูแล) */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type BackupRow = {
  id: string;
  table_name: string;
  operation: string;
  row_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  created_at: string;
};

function checkPassword(password: string) {
  const expected = process.env["ADMIN_PASSWORD"] ?? "cns2026";
  if (password !== expected) throw new Error("unauthorized");
}

export const listBackups = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; table?: string; limit?: number }) => {
    if (typeof input?.password !== "string" || !input.password) throw new Error("missing password");
    return input;
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("data_backups")
      .select("id, table_name, operation, row_id, old_data, new_data, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 1000));

    if (data.table) query = query.eq("table_name", data.table);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { count } = await supabaseAdmin
      .from("data_backups")
      .select("*", { count: "exact", head: true });

    return { rows: (rows ?? []) as unknown as BackupRow[], total: count ?? 0 };
  });

export type BackupPolicy = {
  max_rows: number;
  max_age_days: number;
  auto_prune: boolean;
  updated_at?: string;
};

export const getBackupPolicy = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (typeof input?.password !== "string" || !input.password) throw new Error("missing password");
    return input;
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }> } };
      };
    };
    const { data: row, error } = await db
      .from("backup_settings")
      .select("max_rows, max_age_days, auto_prune, updated_at")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as BackupPolicy | null) ?? { max_rows: 2000, max_age_days: 90, auto_prune: true };
  });

export const saveBackupPolicy = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; maxRows: number; maxAgeDays: number; autoPrune: boolean }) => {
    if (typeof input?.password !== "string" || !input.password) throw new Error("missing password");
    const maxRows = Math.max(0, Math.min(Math.floor(Number(input.maxRows) || 0), 100000));
    const maxAgeDays = Math.max(0, Math.min(Math.floor(Number(input.maxAgeDays) || 0), 3650));
    return { password: input.password, maxRows, maxAgeDays, autoPrune: Boolean(input.autoPrune) };
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as {
      from: (t: string) => {
        upsert: (v: unknown, o?: unknown) => Promise<{ error: { message: string } | null }>;
      };
      rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { error } = await db.from("backup_settings").upsert(
      {
        id: "default",
        max_rows: data.maxRows,
        max_age_days: data.maxAgeDays,
        auto_prune: data.autoPrune,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);

    let removed = 0;
    if (data.autoPrune) {
      const { data: n, error: pruneErr } = await db.rpc("prune_data_backups");
      if (pruneErr) throw new Error(pruneErr.message);
      removed = Number(n ?? 0);
    }
    return { ok: true, removed };
  });

export const pruneBackupsNow = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (typeof input?.password !== "string" || !input.password) throw new Error("missing password");
    return input;
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data: n, error } = await db.rpc("prune_data_backups");
    if (error) throw new Error(error.message);
    return { removed: Number(n ?? 0) };
  });

export type RestorePreview = {
  table: string;
  rowId: string | null;
  mode: "overwrite" | "insert";
  changes: { field: string; current: string; restored: string }[];
  unchanged: number;
  snapshot: Record<string, unknown>;
  current: Record<string, unknown> | null;
};

const fmt = (v: unknown) =>
  v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);

/** ตรวจผลกระทบก่อนกู้คืน — บอกว่าข้อมูลจะถูกทับหรือเพิ่มใหม่ และฟิลด์ไหนเปลี่ยนบ้าง */
export const previewRestore = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; backupId: string }) => {
    if (typeof input?.password !== "string" || !input.password) throw new Error("missing password");
    if (typeof input?.backupId !== "string" || !input.backupId) throw new Error("invalid id");
    return input;
  })
  .handler(async ({ data }): Promise<RestorePreview> => {
    checkPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("data_backups")
      .select("table_name, row_id, old_data, new_data")
      .eq("id", data.backupId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not found");

    const snapshot = (row.old_data ?? row.new_data) as Record<string, unknown> | null;
    if (!snapshot) throw new Error("ไม่มีข้อมูลสำหรับกู้คืน");

    const id = (snapshot["id"] as string | undefined) ?? row.row_id ?? null;
    let current: Record<string, unknown> | null = null;
    if (id) {
      const { data: cur } = await supabaseAdmin
        .from(row.table_name as "participants")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      current = (cur as Record<string, unknown> | null) ?? null;
    }

    const changes: RestorePreview["changes"] = [];
    let unchanged = 0;
    for (const [field, value] of Object.entries(snapshot)) {
      const cur = current ? current[field] : undefined;
      if (current && fmt(cur) === fmt(value)) unchanged += 1;
      else changes.push({ field, current: current ? fmt(cur) : "—", restored: fmt(value) });
    }

    return {
      table: row.table_name,
      rowId: id,
      mode: current ? "overwrite" : "insert",
      changes,
      unchanged,
      snapshot,
      current,
    };
  });

export const restoreBackup = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; backupId: string }) => {
    if (typeof input?.password !== "string" || !input.password) throw new Error("missing password");
    if (typeof input?.backupId !== "string" || !input.backupId) throw new Error("invalid id");
    return input;
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("data_backups")
      .select("table_name, old_data, new_data")
      .eq("id", data.backupId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not found");

    const snapshot = (row.old_data ?? row.new_data) as Record<string, unknown> | null;
    if (!snapshot) throw new Error("ไม่มีข้อมูลสำหรับกู้คืน");

    const { error: upErr } = await supabaseAdmin
      .from(row.table_name as "participants")
      .upsert(snapshot as never, { onConflict: "id" });
    if (upErr) throw new Error(upErr.message);

    return { ok: true, table: row.table_name };
  });

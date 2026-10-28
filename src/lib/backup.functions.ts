import { createServerFn } from "@tanstack/react-start";

import { ALL_ROLES, requireAdmin, WRITE_ROLES } from "./admin-session";

/** ระบบสำรองข้อมูลอัตโนมัติ — อ่าน/กู้คืนสแนปช็อตจากตาราง data_backups (ต้องใช้โทเคนผู้ดูแลจาก adminLogin) */

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

export const listBackups = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; table?: string; limit?: number }) => {
    if (typeof input?.token !== "string" || !input.token) throw new Error("unauthorized");
    return input;
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token, ALL_ROLES);
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
  .inputValidator((input: { token: string }) => {
    if (typeof input?.token !== "string" || !input.token) throw new Error("unauthorized");
    return input;
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token, ALL_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            k: string,
            v: string,
          ) => { maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }> };
        };
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
  .inputValidator(
    (input: { token: string; maxRows: number; maxAgeDays: number; autoPrune: boolean }) => {
      if (typeof input?.token !== "string" || !input.token) throw new Error("unauthorized");
      const maxRows = Math.max(0, Math.min(Math.floor(Number(input.maxRows) || 0), 100000));
      const maxAgeDays = Math.max(0, Math.min(Math.floor(Number(input.maxAgeDays) || 0), 3650));
      return { token: input.token, maxRows, maxAgeDays, autoPrune: Boolean(input.autoPrune) };
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.token, WRITE_ROLES);
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
  .inputValidator((input: { token: string }) => {
    if (typeof input?.token !== "string" || !input.token) throw new Error("unauthorized");
    return input;
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token, WRITE_ROLES);
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
};

const fmt = (v: unknown) =>
  v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);

/** ตรวจผลกระทบก่อนกู้คืน — บอกว่าข้อมูลจะถูกทับหรือเพิ่มใหม่ และฟิลด์ไหนเปลี่ยนบ้าง */
export const previewRestore = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; backupId: string }) => {
    if (typeof input?.token !== "string" || !input.token) throw new Error("unauthorized");
    if (typeof input?.backupId !== "string" || !input.backupId) throw new Error("invalid id");
    return input;
  })
  .handler(async ({ data }): Promise<RestorePreview> => {
    await requireAdmin(data.token, ALL_ROLES);
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
    };
  });

export const restoreBackup = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; backupId: string }) => {
    if (typeof input?.token !== "string" || !input.token) throw new Error("unauthorized");
    if (typeof input?.backupId !== "string" || !input.backupId) throw new Error("invalid id");
    return input;
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token, WRITE_ROLES);
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

    const rowId = (snapshot["id"] as string | undefined) ?? null;
    const { error: upErr } = await supabaseAdmin
      .from(row.table_name as "participants")
      .upsert(snapshot as never, { onConflict: "id" });
    if (upErr) {
      const detail = [upErr.message, upErr.details, upErr.hint].filter(Boolean).join(" · ");
      throw new Error(`${detail || "ไม่ทราบสาเหตุ"}${upErr.code ? ` (รหัส ${upErr.code})` : ""}`);
    }

    return {
      ok: true,
      table: row.table_name,
      rowId,
      at: new Date().toISOString(),
    };
  });

export type AuditRow = {
  id: string;
  table_name: string;
  operation: string;
  row_id: string | null;
  actor: string | null;
  actor_source: string | null;
  label: string;
  created_at: string;
};

/** ประวัติการเปลี่ยนแปลงข้อมูล: ใครทำอะไร ตอนไหน (จากระบบสำรองอัตโนมัติ) */
export const listAuditLog = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      token: string;
      table?: string;
      actor?: string;
      operation?: string;
      limit?: number;
    }) => {
      if (typeof input?.token !== "string" || !input.token) throw new Error("unauthorized");
      return input;
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.token, ALL_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("data_backups")
      .select(
        "id, table_name, operation, row_id, old_data, new_data, created_at, actor, actor_source",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 1000));

    if (data.table) query = query.eq("table_name", data.table);
    if (data.operation) query = query.eq("operation", data.operation);
    if (data.actor) query = query.eq("actor" as "table_name", data.actor);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as unknown as (BackupRow & {
      actor: string | null;
      actor_source: string | null;
    })[];

    const out: AuditRow[] = list.map((r) => {
      const snap = (r.new_data ?? r.old_data ?? {}) as Record<string, Json>;
      const name =
        (snap["name"] as string) || (snap["title"] as string) || r.row_id?.slice(0, 8) || "-";
      return {
        id: r.id,
        table_name: r.table_name,
        operation: r.operation,
        row_id: r.row_id,
        actor: r.actor ?? null,
        actor_source: r.actor_source ?? null,
        label: name,
        created_at: r.created_at,
      };
    });

    const actors = Array.from(
      new Set(out.map((r) => r.actor).filter((a): a is string => !!a)),
    ).sort();
    const last = out[0]?.created_at ?? null;

    return { rows: out, actors, total: out.length, lastBackupAt: last };
  });

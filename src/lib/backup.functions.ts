import { createServerFn } from "@tanstack/react-start";

/** ระบบสำรองข้อมูลอัตโนมัติ — อ่าน/กู้คืนสแนปช็อตจากตาราง data_backups (ต้องใช้รหัสผู้ดูแล) */

export type BackupRow = {
  id: string;
  table_name: string;
  operation: string;
  row_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
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

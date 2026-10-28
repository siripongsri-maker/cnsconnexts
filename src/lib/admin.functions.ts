import { createServerFn } from "@tanstack/react-start";

import { requireAdmin } from "./admin-session";

/**
 * การจัดการข้อมูลจากหลังบ้าน (ผู้ดูแล) — ใช้สิทธิ์ฝั่งเซิร์ฟเวอร์เพื่อข้าม RLS
 * ต้องส่งโทเคนผู้ดูแล (จาก adminLogin) มาด้วยทุกครั้ง เฉพาะบทบาท superadmin/owner
 */

const ADMIN_TABLES = [
  "participants",
  "ideas",
  "submissions",
  "province_notes",
  "connections",
  "commitments",
  "messages",
] as const;

export type AdminTable = (typeof ADMIN_TABLES)[number];

type AdminInput = {
  token: string;
  table: AdminTable;
  id: string;
  patch?: Record<string, unknown> | undefined;
};

function assertInput(input: AdminInput): AdminInput {
  if (typeof input?.token !== "string" || !input.token) throw new Error("unauthorized");
  if (!ADMIN_TABLES.includes(input.table)) throw new Error("invalid table");
  // id ถูกนำไปต่อใน filter .or() จึงต้องเป็น UUID เท่านั้น
  if (typeof input.id !== "string" || !UUID_RE.test(input.id)) throw new Error("invalid id");
  return input;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const adminDeleteRow = createServerFn({ method: "POST" })
  .inputValidator((input: AdminInput) => assertInput(input))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.table === "participants") {
      // ลบข้อมูลที่ผูกกับคนนี้ก่อน เพื่อไม่ให้ติด foreign key
      const { data: conns } = await supabaseAdmin
        .from("connections")
        .select("id")
        .or(`user_a.eq.${data.id},user_b.eq.${data.id}`);
      const connIds = (conns ?? []).map((c) => c.id);
      if (connIds.length) {
        await supabaseAdmin.from("messages").delete().in("connection_id", connIds);
        await supabaseAdmin.from("commitments").delete().in("connection_id", connIds);
        await supabaseAdmin.from("connections").delete().in("id", connIds);
      }
      await supabaseAdmin.from("messages").delete().eq("from_id", data.id);
      await supabaseAdmin.from("ideas").delete().eq("owner_id", data.id);
      await supabaseAdmin.from("province_notes").delete().eq("author_id", data.id);
    }

    if (data.table === "connections") {
      await supabaseAdmin.from("messages").delete().eq("connection_id", data.id);
      await supabaseAdmin.from("commitments").delete().eq("connection_id", data.id);
    }

    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateRow = createServerFn({ method: "POST" })
  .inputValidator((input: AdminInput) => assertInput(input))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    if (!data.patch || typeof data.patch !== "object") throw new Error("missing patch");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(data.table)
      .update(data.patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

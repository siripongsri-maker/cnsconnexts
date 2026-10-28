import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const getPublicProject = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"];
    if (!key || !url) throw new Error("ไม่สามารถโหลดข้อมูลโปรเจกต์ได้");
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const result = await client.from("submissions").select("id,name,course,batch,region,province,policy_issues,summary,highlight,wanted,photo,stage_ready,showcase,created_at,contact_name,contact_organization,contact_phone,contact_email,contact_url").eq("id", data.id).maybeSingle();
    if (result.error) throw new Error("ไม่สามารถโหลดข้อมูลโปรเจกต์ได้ กรุณาลองอีกครั้ง");
    return result.data;
  });
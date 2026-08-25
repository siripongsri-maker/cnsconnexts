import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/**
 * ไคลเอนต์ฐานข้อมูลสำหรับอ่าน/เขียนข้อมูลกิจกรรม
 * แนบ x-device-id ไปกับ "ทุกคำขอ" เพื่อให้ RLS รู้ว่าใครเป็นเจ้าของข้อมูล
 * (การตั้งค่า header ผ่าน supabase.rest.headers ไม่น่าเชื่อถือ ทำให้ upsert โปรไฟล์
 *  ถูกปฏิเสธเงียบๆ และข้อมูลผู้ใช้ใหม่ไม่ถูกบันทึกขึ้นฐานข้อมูลกลาง)
 */
const DEVICE_KEY = "connexts-device-id";

function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function deviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function createDbClient() {
  const url = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) throw new Error("Missing Supabase environment variables");

  const isOpaqueKey = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) {
          new Headers(init.headers).forEach((value, k) => headers.set(k, value));
        }
        if (isOpaqueKey && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        const id = deviceId();
        if (id) headers.set("x-device-id", id);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

let _db: ReturnType<typeof createDbClient> | undefined;

export const db = new Proxy({} as ReturnType<typeof createDbClient>, {
  get(_, prop, receiver) {
    if (!_db) _db = createDbClient();
    return Reflect.get(_db, prop, receiver);
  },
});

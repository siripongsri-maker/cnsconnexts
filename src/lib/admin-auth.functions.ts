import { createServerFn } from "@tanstack/react-start";

import { ALL_ROLES, requireAdmin, signSession, verifyCredentials, type AdminRole } from "./admin-session";
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { getRequest } from '@tanstack/react-start/server';

async function recordLogin(account: string, method: 'google' | 'password', outcome: 'success' | 'denied', reason = '', userId?: string, sessionKey?: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('admin_login_history').upsert({
    account: account.slice(0, 254), method, outcome, reason, user_id: userId ?? null, session_key: sessionKey ?? null,
  }, { onConflict: 'session_key', ignoreDuplicates: true });
  if (error) throw new Error('ไม่สามารถบันทึกประวัติการเข้าสู่ระบบได้');
}

export const adminGoogleLogin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<
    | { ok: true; token: string; user: string; role: AdminRole; exp: number }
    | { ok: false; error: string }
  > => {
    const bearer = getRequest().headers.get('authorization');
    if (!bearer?.startsWith('Bearer ')) return { ok: false, error: 'กรุณาเข้าสู่ระบบ Google อีกครั้ง' };
    const { data: identity, error } = await context.supabase.auth.getUser(bearer.slice(7));
    const user = identity.user;
    if (error || !user?.email) return { ok: false, error: 'กรุณาเข้าสู่ระบบ Google อีกครั้ง' };
    const account = user.email.toLowerCase();
    const sessionKey = typeof context.claims['session_id'] === 'string'
      ? `google:${context.claims['session_id']}` : undefined;
    const { data: granted, error: grantError } = await context.supabase.rpc('claim_google_admin_role');
    const roles = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId);
    const role = ALL_ROLES.find(r => roles.data?.some(row => row.role === r));
    if (grantError || !granted || !role || !user.identities?.some(i => i.provider === 'google')) {
      await recordLogin(account, 'google', 'denied', 'บัญชี Google ไม่มีสิทธิ์ผู้ดูแล', user.id, sessionKey);
      return { ok: false, error: 'บัญชี Google นี้ไม่มีสิทธิ์เข้าสู่ระบบหลังบ้าน' };
    }
    const session = await signSession({ user: account, role, userId: user.id, method: 'google' }, process.env);
    await recordLogin(account, 'google', 'success', '', user.id, sessionKey);
    return { ok: true, user: account, role, ...session };
  });

export const getAdminLoginHistory = createServerFn({ method: 'POST' })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.token, ['superadmin', 'owner']);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('admin_login_history')
      .select('id,account,method,outcome,reason,created_at').order('created_at', { ascending: false }).limit(500);
    if (result.error) throw new Error('โหลดประวัติการเข้าสู่ระบบไม่สำเร็จ');
    return result.data;
  });

/** ล็อกอินผู้ดูแล — ตรวจรหัสฝั่งเซิร์ฟเวอร์ แล้วออกโทเคนที่หมดอายุได้ */
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { user: string; password: string }) => {
    if (typeof input?.user !== "string" || typeof input?.password !== "string")
      throw new Error("invalid input");
    if (input.user.length > 64 || input.password.length > 256) throw new Error("invalid input");
    return input;
  })
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; token: string; user: string; role: AdminRole; exp: number }
      | { ok: false; error: string }
    > => {
      const account = await verifyCredentials(data.user, data.password, process.env);
      if (!account) {
        await recordLogin(data.user.trim().toLowerCase(), 'password', 'denied', 'ข้อมูลเข้าสู่ระบบไม่ถูกต้องหรือบัญชีถูกย้ายไป Google');
        return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง — superadmin ใช้ Google เท่านั้น" };
      }
      try {
        const { token, exp } = await signSession(account, process.env);
        await recordLogin(account.user, 'password', 'success');
        return { ok: true, token, exp, ...account };
      } catch (e) {
        console.error("[adminLogin]", (e as Error).message);
        return { ok: false, error: "ระบบผู้ดูแลยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์" };
      }
    },
  );

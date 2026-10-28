/**
 * ประตูล็อกอินผู้ดูแล + ระบบสิทธิ์ (RBAC)
 * รหัสผ่านตรวจที่เซิร์ฟเวอร์ (adminLogin) เท่านั้น ไคลเอนต์เก็บแค่โทเคนที่หมดอายุได้
 * ทุก server function ของหลังบ้านตรวจโทเคนและบทบาทซ้ำเอง — สถานะในเครื่องใช้แค่ซ่อน/แสดงหน้าจอ
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminGoogleLogin, adminLogin } from "./admin-auth.functions";
import { useAuth } from './auth';
import { lovable } from '@/integrations/lovable';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { AdminRole } from "./admin-session";
import { logUsage } from "./usage-log";

export type { AdminRole };

const SESSION_KEY = "connext-admin-token";
// คีย์เดิมจากเวอร์ชันที่ตรวจรหัสในเบราว์เซอร์ — ลบทิ้งเมื่อพบ
const LEGACY_KEYS = ["connext-admin-session", "connext-admin-role"];

/** สิทธิ์ที่ควบคุมการใช้งานหน้า Log */
export type AdminPermission = "logs:view" | "logs:search" | "logs:export" | "logs:clear";

export const ROLE_TH: Record<AdminRole, string> = {
  superadmin: "ซูเปอร์แอดมิน",
  owner: "ผู้ดูแลสูงสุด",
  analyst: "นักวิเคราะห์ข้อมูล",
  viewer: "ผู้ชมอย่างเดียว",
};

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  superadmin: ["logs:view", "logs:search", "logs:export", "logs:clear"],
  owner: ["logs:view", "logs:search", "logs:export", "logs:clear"],
  analyst: ["logs:view", "logs:search", "logs:export"],
  viewer: ["logs:view"],
};

type StoredSession = { token: string; user: string; role: AdminRole; exp: number };

function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (
      typeof parsed?.token !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Date.now()
      || (parsed.role === 'superadmin' && (!parsed.user?.includes('@')))
    ) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** โทเคนผู้ดูแลที่ยังไม่หมดอายุ สำหรับส่งให้ server function ของหลังบ้าน */
export function getAdminToken(): string | null {
  return readSession()?.token ?? null;
}

/** สถานะล็อกอินผู้ดูแล พร้อมสิทธิ์ตามบทบาท */
export function useAdminAuth() {
  const auth = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const s = readSession();
    setAuthed(Boolean(s));
    setRole(s?.role ?? null);
    setUser(s?.user ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (auth.mode === 'loading') return;
    const existing = readSession();
    if (auth.mode !== 'user') {
      if (existing?.role === 'superadmin' && existing.user.includes('@')) {
        window.localStorage.removeItem(SESSION_KEY);
        setAuthed(false); setRole(null); setUser(null);
      }
      return;
    }
    let cancelled = false;
    setReady(false);
    adminGoogleLogin().then(res => {
      if (cancelled) return;
      if (!res.ok) {
        setGoogleError(res.error);
        window.localStorage.removeItem(SESSION_KEY);
        setAuthed(false); setRole(null); setUser(null);
        return;
      }
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(res));
      setAuthed(true); setRole(res.role); setUser(res.user); setGoogleError(null);
    }).catch(() => {
      if (!cancelled) {
        setGoogleError('ตรวจสอบสิทธิ์ Google ไม่สำเร็จ กรุณาลองใหม่');
        setAuthed(false); setRole(null); setUser(null);
        window.localStorage.removeItem(SESSION_KEY);
      }
    }).finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [auth.mode, auth.user?.id]);

  const signInGoogle = useCallback(async (): Promise<string | null> => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/admin`,
      extraParams: { prompt: 'select_account' },
    });
    return result.error ? 'เข้าสู่ระบบ Google ไม่สำเร็จ กรุณาลองใหม่' : null;
  }, []);

  /** คืน null เมื่อสำเร็จ หรือข้อความผิดพลาด */
  const signIn = useCallback(async (u: string, password: string): Promise<string | null> => {
    let res: Awaited<ReturnType<typeof adminLogin>>;
    try {
      res = await adminLogin({ data: { user: u, password } });
    } catch {
      return "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง";
    }
    if (!res.ok) return res.error;
    const session: StoredSession = {
      token: res.token,
      user: res.user,
      role: res.role,
      exp: res.exp,
    };
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
    setAuthed(true);
    setRole(session.role);
    setUser(session.user);
    logUsage("admin", "ผู้ดูแลเข้าสู่ระบบหลังบ้าน", `${session.user} · ${ROLE_TH[session.role]}`);
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    logUsage("admin", "ผู้ดูแลออกจากระบบหลังบ้าน");
    setAuthed(false);
    setRole(null);
    setUser(null);
    await auth.signOut();
    await router.navigate({ to: '/admin', replace: true });
  }, [auth.signOut, queryClient, router]);

  const permissions = useMemo(() => (role ? ROLE_PERMISSIONS[role] : []), [role]);

  const can = useCallback(
    (permission: AdminPermission) => permissions.includes(permission),
    [permissions],
  );

  return { ready, authed, role, user, permissions, can, signIn, signOut, signInGoogle, googleError };
}

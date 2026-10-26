/**
 * ประตูล็อกอินผู้ดูแล + ระบบสิทธิ์ (RBAC) แบบโปรโตไทป์ฝั่งไคลเอนต์
 * หมายเหตุ: ข้อมูลทั้งหมดเก็บในเครื่องผู้ใช้ รหัสนี้จึงเป็นเพียง "ประตูกั้น" สำหรับใช้ในงาน
 * ไม่ใช่ระบบยืนยันตัวตนจริง
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { logUsage } from "./usage-log";

export const SUPERADMIN_USER = "superadmin";
export const SUPERADMIN_PASSWORD = "CNS-Super#2026";
export const ADMIN_USER = "connexts";
export const ADMIN_PASSWORD = "cns2026";

const KEY = "connext-admin-session";
const ROLE_KEY = "connext-admin-role";

/** บทบาทผู้ดูแล */
export type AdminRole = "superadmin" | "owner" | "analyst" | "viewer";

/** สิทธิ์ที่ควบคุมการใช้งานหน้า Log */
export type AdminPermission =
  | "logs:view"
  | "logs:search"
  | "logs:export"
  | "logs:clear";

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

type Account = { user: string; password: string; role: AdminRole };

const ACCOUNTS: Account[] = [
  { user: SUPERADMIN_USER, password: SUPERADMIN_PASSWORD, role: "superadmin" },
  { user: ADMIN_USER, password: ADMIN_PASSWORD, role: "owner" },
  { user: "analyst", password: "cns2026-analyst", role: "analyst" },
  { user: "viewer", password: "cns2026-viewer", role: "viewer" },
];

/** ค้นบัญชีที่ตรงกับชื่อผู้ใช้/รหัสผ่าน */
export function findAccount(user: string, password: string): Account | undefined {
  const u = user.trim().toLowerCase();
  return ACCOUNTS.find((a) => a.user === u && a.password === password);
}

export function checkAdmin(user: string, password: string) {
  return Boolean(findAccount(user, password));
}

function readSession(): { authed: boolean; role: AdminRole | null; user: string | null } {
  if (typeof window === "undefined") return { authed: false, role: null, user: null };
  try {
    const authed = window.localStorage.getItem(KEY) === "1";
    const raw = window.localStorage.getItem(ROLE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { role: AdminRole; user: string }) : null;
    return {
      authed,
      role: authed ? (parsed?.role ?? "owner") : null,
      user: authed ? (parsed?.user ?? ADMIN_USER) : null,
    };
  } catch {
    return { authed: false, role: null, user: null };
  }
}

/** สถานะล็อกอินผู้ดูแล พร้อมสิทธิ์ตามบทบาท */
export function useAdminAuth() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const s = readSession();
    setAuthed(s.authed);
    setRole(s.role);
    setUser(s.user);
    setReady(true);
  }, []);

  const signIn = useCallback((u: string, password: string) => {
    const account = findAccount(u, password);
    if (!account) return false;
    try {
      window.localStorage.setItem(KEY, "1");
      window.localStorage.setItem(
        ROLE_KEY,
        JSON.stringify({ role: account.role, user: account.user }),
      );
    } catch {
      /* ignore */
    }
    setAuthed(true);
    setRole(account.role);
    setUser(account.user);
    logUsage("admin", "ผู้ดูแลเข้าสู่ระบบหลังบ้าน", `${account.user} · ${ROLE_TH[account.role]}`);
    return true;
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
      window.localStorage.removeItem(ROLE_KEY);
    } catch {
      /* ignore */
    }
    logUsage("admin", "ผู้ดูแลออกจากระบบหลังบ้าน");
    setAuthed(false);
    setRole(null);
    setUser(null);
  }, []);

  const permissions = useMemo(
    () => (role ? ROLE_PERMISSIONS[role] : []),
    [role],
  );

  const can = useCallback(
    (permission: AdminPermission) => permissions.includes(permission),
    [permissions],
  );

  return { ready, authed, role, user, permissions, can, signIn, signOut };
}

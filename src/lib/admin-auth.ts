/**
 * ประตูล็อกอินผู้ดูแล (โปรโตไทป์ฝั่งไคลเอนต์)
 * หมายเหตุ: ข้อมูลทั้งหมดเก็บในเครื่องผู้ใช้ รหัสนี้จึงเป็นเพียง "ประตูกั้น" สำหรับใช้ในงาน
 * ไม่ใช่ระบบยืนยันตัวตนจริง
 */
import { useCallback, useEffect, useState } from "react";

export const ADMIN_USER = "connexts";
export const ADMIN_PASSWORD = "cns2026";

const KEY = "connext-admin-session";

export function checkAdmin(user: string, password: string) {
  return user.trim().toLowerCase() === ADMIN_USER && password === ADMIN_PASSWORD;
}

function read() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** สถานะล็อกอินผู้ดูแล */
export function useAdminAuth() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(read());
    setReady(true);
  }, []);

  const signIn = useCallback((user: string, password: string) => {
    if (!checkAdmin(user, password)) return false;
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setAuthed(true);
    return true;
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
  }, []);

  return { ready, authed, signIn, signOut };
}

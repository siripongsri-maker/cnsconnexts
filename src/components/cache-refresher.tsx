import { useEffect } from "react";

/** เปลี่ยนเลขนี้ทุกครั้งที่ต้องการบังคับให้เครื่องผู้ใช้โหลดเวอร์ชันใหม่ */
export const APP_BUILD = "2026-08-25-5";

const KEY = "connexts-build";

/**
 * ล้าง cache/Service Worker เก่าครั้งเดียวเมื่อเวอร์ชันของเว็บเปลี่ยน
 * เพื่อให้ผู้ใช้ที่เคยเปิดเว็บมาก่อนได้ไฟล์ใหม่ทันทีหลัง publish
 */
export function CacheRefresher() {
  useEffect(() => {
    let prev: string | null = null;
    try {
      prev = localStorage.getItem(KEY);
    } catch {
      return;
    }
    if (prev === APP_BUILD) return;

    void (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if (typeof caches !== "undefined") {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem(KEY, APP_BUILD);
      } catch {
        /* ignore */
      }
      // โหลดใหม่หนึ่งครั้งเฉพาะกรณีที่เคยมีเวอร์ชันเก่าค้างอยู่
      if (prev) window.location.reload();
    })();
  }, []);

  return null;
}

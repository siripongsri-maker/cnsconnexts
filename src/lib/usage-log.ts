import { useCallback, useEffect, useState } from "react";

/** PDPA consent + usage logging (client-side, localStorage). */

const LOG_KEY = "connexts-usage-log-v1";
const CONSENT_KEY = "connexts-pdpa-consent-v1";
const VISITOR_KEY = "connexts-visitor-id";
const CONSENT_STATS_KEY = "connexts-consent-stats-v1";
const MAX_LOGS = 1000;

export const CONSENT_VERSION = "1.0";

export type ConsentValue = "accepted" | "declined";

export type ConsentRecord = {
  value: ConsentValue;
  version: string;
  decided_at: string;
};

export type UsageLog = {
  id: string;
  at: string;
  visitor: string;
  type: "page_view" | "action" | "auth" | "admin" | "consent";
  label: string;
  detail?: string;
  path?: string;
  /** แหล่งที่มาของผู้เข้าชม (hostname ของ referrer หรือ "direct") */
  source?: string;
};

export type ConsentStats = { accepted: number; declined: number };

export const CONSENT_EVENT = "connexts:consent-changed";
export const LOG_EVENT = "connexts:usage-log";

function emit(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name));
}

export function getConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    return parsed?.value ? parsed : null;
  } catch {
    return null;
  }
}

export function getConsentStats(): ConsentStats {
  if (typeof window === "undefined") return { accepted: 0, declined: 0 };
  try {
    const raw = localStorage.getItem(CONSENT_STATS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ConsentStats>) : null;
    return { accepted: Number(parsed?.accepted ?? 0), declined: Number(parsed?.declined ?? 0) };
  } catch {
    return { accepted: 0, declined: 0 };
  }
}

function bumpConsentStats(value: ConsentValue) {
  try {
    const stats = getConsentStats();
    const next: ConsentStats = {
      accepted: stats.accepted + (value === "accepted" ? 1 : 0),
      declined: stats.declined + (value === "declined" ? 1 : 0),
    };
    localStorage.setItem(CONSENT_STATS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** hostname ของ referrer หรือ "direct" เมื่อเข้าตรง */
export function getSource(): string {
  if (typeof window === "undefined") return "direct";
  try {
    const ref = document.referrer;
    if (!ref) return "direct";
    const host = new URL(ref).hostname;
    if (!host || host === window.location.hostname) return "direct";
    return host.replace(/^www\./, "");
  } catch {
    return "direct";
  }
}

export function setConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  const record: ConsentRecord = {
    value,
    version: CONSENT_VERSION,
    decided_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* ignore */
  }
  bumpConsentStats(value);
  if (value === "accepted") {
    logUsage("consent", "ยินยอมให้เก็บข้อมูลการใช้งาน", `เวอร์ชัน ${CONSENT_VERSION}`);
  } else {
    clearLogs();
  }
  emit(CONSENT_EVENT);
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "anon";
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `v-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/* ---------- นโยบายการเก็บรักษาข้อมูล (Retention) ---------- */

const RETENTION_KEY = "connexts-log-retention-v1";
export const RETENTION_EVENT = "connexts:log-retention";
/** จำนวนวันที่เก็บบันทึกโดยปริยาย (0 = ไม่ลบอัตโนมัติ) */
export const DEFAULT_RETENTION_DAYS = 90;

export const RETENTION_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 7, label: "7 วัน" },
  { days: 30, label: "30 วัน" },
  { days: 90, label: "90 วัน (แนะนำ)" },
  { days: 180, label: "180 วัน" },
  { days: 365, label: "1 ปี" },
  { days: 0, label: "ไม่ลบอัตโนมัติ" },
];

export function getRetentionDays(): number {
  if (typeof window === "undefined") return DEFAULT_RETENTION_DAYS;
  try {
    const raw = localStorage.getItem(RETENTION_KEY);
    if (raw === null) return DEFAULT_RETENTION_DAYS;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_RETENTION_DAYS;
  } catch {
    return DEFAULT_RETENTION_DAYS;
  }
}

export function setRetentionDays(days: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RETENTION_KEY, String(Math.max(0, Math.floor(days))));
  } catch {
    /* ignore */
  }
  emit(RETENTION_EVENT);
  purgeExpiredLogs();
  emit(LOG_EVENT);
}

/** วันหมดอายุของบันทึกหนึ่งรายการ (null = ไม่หมดอายุ) */
export function logExpiresAt(log: UsageLog, days = getRetentionDays()): Date | null {
  if (!days) return null;
  return new Date(new Date(log.at).getTime() + days * 86_400_000);
}

/** วันเก่าสุดที่ยังเก็บไว้ (null = ไม่ลบอัตโนมัติ) */
export function retentionCutoff(days = getRetentionDays()): Date | null {
  if (!days) return null;
  return new Date(Date.now() - days * 86_400_000);
}

function readLogs(): UsageLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as UsageLog[]) : [];
  } catch {
    return [];
  }
}

/** ลบบันทึกที่เกินอายุการเก็บรักษาออกจากเครื่อง คืนค่าจำนวนที่ลบ */
export function purgeExpiredLogs(): number {
  if (typeof window === "undefined") return 0;
  const cutoff = retentionCutoff();
  if (!cutoff) return 0;
  const logs = readLogs();
  const kept = logs.filter((l) => new Date(l.at).getTime() >= cutoff.getTime());
  if (kept.length === logs.length) return 0;
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(kept));
  } catch {
    /* ignore */
  }
  return logs.length - kept.length;
}

export function getLogs(): UsageLog[] {
  if (typeof window === "undefined") return [];
  purgeExpiredLogs();
  return readLogs();
}

export function clearLogs() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    /* ignore */
  }
  emit(LOG_EVENT);
}

/** อ่าน/ตั้งค่านโยบายการเก็บรักษาแบบเรียลไทม์ */
export function useRetention() {
  const [days, setDays] = useState(DEFAULT_RETENTION_DAYS);

  useEffect(() => {
    const sync = () => setDays(getRetentionDays());
    sync();
    purgeExpiredLogs();
    window.addEventListener(RETENTION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(RETENTION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((next: number) => {
    setRetentionDays(next);
    setDays(getRetentionDays());
  }, []);

  return { days, setDays: update, cutoff: retentionCutoff(days) };
}


/** Records an event only when the visitor has consented (consent events always record). */
export function logUsage(
  type: UsageLog["type"],
  label: string,
  detail?: string,
  path?: string,
) {
  if (typeof window === "undefined") return;
  if (type !== "consent" && getConsent()?.value !== "accepted") return;

  const entry: UsageLog = {
    id: `l-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`,
    at: new Date().toISOString(),
    visitor: getVisitorId(),
    type,
    label,
    ...(detail ? { detail } : {}),
    path: path ?? window.location.pathname,
    source: getSource(),
  };

  try {
    const next = [entry, ...getLogs()].slice(0, MAX_LOGS);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emit(LOG_EVENT);
}

export function useConsent() {
  const [consent, setConsentState] = useState<ConsentRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setConsentState(getConsent());
    sync();
    setReady(true);
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const decide = useCallback((value: ConsentValue) => setConsent(value), []);
  return { ready, consent, decide };
}

export function useUsageLogs() {
  const [logs, setLogs] = useState<UsageLog[]>([]);

  useEffect(() => {
    const sync = () => setLogs(getLogs());
    sync();
    // ลบบันทึกหมดอายุอัตโนมัติเป็นระยะ
    const timer = window.setInterval(() => {
      if (purgeExpiredLogs()) sync();
    }, 60_000);
    window.addEventListener(LOG_EVENT, sync);
    window.addEventListener(RETENTION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(LOG_EVENT, sync);
      window.removeEventListener(RETENTION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return logs;
}

export const LOG_TYPE_LABEL: Record<UsageLog["type"], string> = {
  page_view: "เข้าหน้า",
  action: "การใช้งาน",
  auth: "เข้าสู่ระบบ",
  admin: "หลังบ้าน",
  consent: "ความยินยอม",
};

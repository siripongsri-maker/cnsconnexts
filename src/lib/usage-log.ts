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
};

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

export function getLogs(): UsageLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as UsageLog[]) : [];
  } catch {
    return [];
  }
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
    window.addEventListener(LOG_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LOG_EVENT, sync);
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

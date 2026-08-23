import type { UserSource } from "./types";

const SESSION_KEY = "connecting-power-session";

export type ParticipantSession = {
  id: string;
  source: UserSource;
  code: string | null;
  started_at: string;
};

function randomId() {
  return `s-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function createSession(source: ParticipantSession["source"], code?: string | null) {
  const session: ParticipantSession = {
    id: randomId(),
    source,
    code: code ?? null,
    started_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
  return session;
}

export function getSession(): ParticipantSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ParticipantSession) : null;
  } catch {
    return null;
  }
}

/** Short human-friendly code printed under the QR poster. */
export function makeJoinCode() {
  return "NHA26";
}

/** Read a source value from a URLSearchParams object (e.g. ?source=qr). */
export function sourceFromSearch(params: URLSearchParams): UserSource {
  const raw = params.get("source");
  if (
    raw === "qr" ||
    raw === "link" ||
    raw === "invite" ||
    raw === "direct" ||
    raw === "auth" ||
    raw === "demo" ||
    raw === "admin"
  ) {
    return raw;
  }
  return "direct";
}

/**
 * เซสชันผู้ดูแลแบบลงลายเซ็นฝั่งเซิร์ฟเวอร์ (HMAC-SHA256)
 * - รหัสผ่านอ่านจาก env เท่านั้น ไม่มีค่าสำรองในโค้ด บัญชีที่ไม่ได้ตั้งรหัสจะใช้ไม่ได้
 * - หลังล็อกอิน เซิร์ฟเวอร์ออกโทเคนที่หมดอายุได้ ไคลเอนต์ส่งโทเคนนี้แทนรหัสผ่าน
 * ใช้ Web Crypto จึงรันได้ทั้ง Node และ Cloudflare Workers
 */

export type AdminRole = "superadmin" | "owner" | "analyst" | "viewer";

export type AdminSession = { user: string; role: AdminRole; exp: number };

/** บทบาทที่แก้ไข/ลบ/กู้คืนข้อมูลได้ */
export const WRITE_ROLES: readonly AdminRole[] = ["superadmin", "owner"];
export const ALL_ROLES: readonly AdminRole[] = ["superadmin", "owner", "analyst", "viewer"];

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type Env = Record<string, string | undefined>;

/** บัญชีผู้ดูแล — ชื่อผู้ใช้คงที่ รหัสผ่านมาจาก env */
const ACCOUNT_ENV: { user: string; role: AdminRole; env: string }[] = [
  { user: "superadmin", role: "superadmin", env: "SUPERADMIN_PASSWORD" },
  { user: "connexts", role: "owner", env: "ADMIN_PASSWORD" },
  { user: "analyst", role: "analyst", env: "ANALYST_PASSWORD" },
  { user: "viewer", role: "viewer", env: "VIEWER_PASSWORD" },
];

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function sessionSecret(env: Env): string {
  const secret = env["ADMIN_SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("ยังไม่ได้ตั้งค่า ADMIN_SESSION_SECRET (อย่างน้อย 32 ตัวอักษร)");
  }
  return secret;
}

function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/** เทียบรหัสผ่านแบบเวลาคงที่ (เทียบ hash เพื่อไม่ให้ความยาวรั่ว) */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i]! ^ vb[i]!;
  return diff === 0;
}

/** ตรวจชื่อผู้ใช้/รหัสผ่านกับ env — คืนบทบาทเมื่อถูกต้อง */
export async function verifyCredentials(
  user: string,
  password: string,
  env: Env,
): Promise<{ user: string; role: AdminRole } | null> {
  const u = user.trim().toLowerCase();
  let match: { user: string; role: AdminRole } | null = null;
  for (const a of ACCOUNT_ENV) {
    const expected = env[a.env];
    // ตรวจครบทุกบัญชีเสมอ เพื่อไม่ให้เวลาตอบบอกใบ้ว่าชื่อผู้ใช้ไหนมีอยู่
    const ok = Boolean(expected) && (await safeEqual(password, expected ?? "")) && a.user === u;
    if (ok) match = { user: a.user, role: a.role };
  }
  return match;
}

export async function signSession(
  session: { user: string; role: AdminRole },
  env: Env,
  now = Date.now(),
): Promise<{ token: string; exp: number }> {
  const exp = now + SESSION_TTL_MS;
  const body = b64url(encoder.encode(JSON.stringify({ ...session, exp })));
  const key = await hmacKey(sessionSecret(env));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return { token: `${body}.${b64url(sig)}`, exp };
}

export async function verifySession(token: unknown, env: Env, now = Date.now()): Promise<AdminSession | null> {
  if (typeof token !== "string") return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  try {
    const key = await hmacKey(sessionSecret(env));
    const sigBytes = fromB64url(sig);
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes as BufferSource, encoder.encode(body));
    if (!ok) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromB64url(body))) as AdminSession;
    if (!ALL_ROLES.includes(parsed.role) || typeof parsed.user !== "string") return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** ใช้ในทุก server function ของหลังบ้าน — โยน error ถ้าโทเคนไม่ถูกต้องหรือบทบาทไม่พอ */
export async function requireAdmin(
  token: unknown,
  roles: readonly AdminRole[] = WRITE_ROLES,
  env: Env = process.env,
): Promise<AdminSession> {
  const session = await verifySession(token, env);
  if (!session) throw new Error("unauthorized");
  if (!roles.includes(session.role)) throw new Error("forbidden");
  return session;
}

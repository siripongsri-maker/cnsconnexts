import { createServerFn } from "@tanstack/react-start";

import { signSession, verifyCredentials, type AdminRole } from "./admin-session";

/** ล็อกอินผู้ดูแล — ตรวจรหัสฝั่งเซิร์ฟเวอร์ แล้วออกโทเคนที่หมดอายุได้ */
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { user: string; password: string }) => {
    if (typeof input?.user !== "string" || typeof input?.password !== "string") throw new Error("invalid input");
    if (input.user.length > 64 || input.password.length > 256) throw new Error("invalid input");
    return input;
  })
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; token: string; user: string; role: AdminRole; exp: number } | { ok: false; error: string }
    > => {
      const account = await verifyCredentials(data.user, data.password, process.env);
      if (!account) return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      try {
        const { token, exp } = await signSession(account, process.env);
        return { ok: true, token, exp, ...account };
      } catch (e) {
        console.error("[adminLogin]", (e as Error).message);
        return { ok: false, error: "ระบบผู้ดูแลยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์" };
      }
    },
  );

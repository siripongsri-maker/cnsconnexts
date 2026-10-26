import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { LogIn, UserPlus, Sparkles, Link2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { createSession } from "@/lib/session";
import { Avatar } from "@/components/power-bits";
import { ChoicePill } from "@/components/choice-pill";
import { EntryShell } from "@/components/entry-shell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — คนส. Connexts" },
      {
        name: "description",
        content:
          "เข้าสู่ระบบ สมัครสมาชิก หรือเข้าใช้แบบผู้เยี่ยมชม เพื่อเริ่มเชื่อมพลังกับเครือข่าย คนส.",
      },
      { property: "og:title", content: "เข้าสู่ระบบ — คนส. Connexts" },
      {
        property: "og:description",
        content: "เข้าสู่ระบบหรือเข้าใช้แบบ Guest เพื่อเริ่มเชื่อมพลังกับเครือข่าย คนส.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode, user, enterGuest } = useAuth();
  const { me, linkAccount } = useStore();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentEmail, setSentEmail] = useState(false);
  const [linkGuest, setLinkGuest] = useState(true);
  const linkRef = useRef(true);
  linkRef.current = linkGuest;

  const hasLocalProfile = Boolean(me);
  const alreadyLinked = Boolean(me?.linked_at ?? me?.linked_email);

  useEffect(() => {
    if (me?.name && !name) setName(me.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.name]);

  useEffect(() => {
    if (mode !== "user" || !user) return;
    if (me && !me.linked_at && !me.linked_user_id && linkRef.current) {
      linkAccount(user.email ?? "", user.id);
      toast.success("เชื่อมโปรไฟล์เดิมเข้ากับบัญชีนี้แล้ว ข้อมูลของคุณจะไม่หาย");
    }
    void navigate({ to: me ? "/" : "/onboarding", replace: true });
  }, [mode, user, me, linkAccount, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (tab === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentEmail(true);
          toast.success("ส่งอีเมลยืนยันแล้ว กรุณาเปิดลิงก์ในอีเมลเพื่อยืนยันบัญชี");
        } else {
          toast.success("สมัครสมาชิกสำเร็จ");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("เข้าสู่ระบบสำเร็จ");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error(
        message.includes("Invalid login credentials")
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : message.includes("already registered")
            ? "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ"
            : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
      return;
    }
    if (result.redirected) return;
  }

  function handleGuest() {
    enterGuest();
    createSession("auth", null);
    toast.success("เข้าใช้แบบผู้เยี่ยมชมแล้ว");
    void navigate({ to: "/onboarding" });
  }

  const fieldLabel = "block text-body font-semibold text-ink";
  const fieldInput =
    "mt-1 w-full rounded-2xl border-2 bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft/70";

  return (
    <EntryShell
      title={
        <>
          พลังของคุณ
          <br />
          ไปต่อได้ทุกที่
        </>
      }
      subtitle="เก็บโปรไฟล์ การเชื่อมต่อ และนัดหมายไว้กับบัญชีเดียว"
    >
      <div className="flex flex-col gap-4">
        <section aria-labelledby="auth-form-title" className="meadow-card p-5">
          <h2 id="auth-form-title" className="font-heading text-title font-semibold text-ink">
            {tab === "login" ? "กลับมาเชื่อมพลัง" : "เริ่มต้นด้วยกัน"}
          </h2>
          <p className="mt-1 text-body text-ink-soft">
            {tab === "login"
              ? "เข้าสู่ระบบเพื่อใช้โปรไฟล์เดิม"
              : "สร้างบัญชีเพื่อเก็บทุกการเชื่อมต่อ"}
          </p>

          {hasLocalProfile && me && (
            <div className="mt-4 rounded-2xl bg-sky-soft p-4">
              <div className="flex items-start gap-3">
                <Avatar user={me} size={48} />
                <div className="min-w-0">
                  <p className="text-body font-semibold text-ink [overflow-wrap:anywhere]">
                    โปรไฟล์ในเครื่องนี้: {me.name}
                  </p>
                  {alreadyLinked ? (
                    <p className="mt-1 flex items-start gap-2 text-body font-semibold text-[#3D7A1C]">
                      <ShieldCheck className="mt-1 h-6 w-6 shrink-0" aria-hidden />
                      <span className="[overflow-wrap:anywhere]">
                        เชื่อมกับบัญชี {me.linked_email ?? user?.email ?? "อีเมลของคุณ"} แล้ว
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-body text-ink-soft">
                      เชื่อมบัญชีเพื่อเก็บโปรไฟล์และทุกการนัดหมายไว้ด้วยกัน
                    </p>
                  )}
                </div>
              </div>

              {!alreadyLinked && (
                <div className="mt-3">
                  <ChoicePill active={linkGuest} onClick={() => setLinkGuest((v) => !v)}>
                    ใช้โปรไฟล์นี้กับบัญชีของฉัน (แนะนำ)
                  </ChoicePill>
                </div>
              )}
            </div>
          )}

          <div role="group" aria-label="เลือกวิธีเข้าใช้" className="mt-5 grid grid-cols-2 gap-2">
            {(
              [
                ["login", "เข้าสู่ระบบ"],
                ["signup", "สร้างบัญชีใหม่"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setSentEmail(false);
                }}
                aria-pressed={tab === key}
                className={`tap min-h-14 rounded-2xl border-2 px-2 text-center text-body font-semibold ${
                  tab === key
                    ? "border-primary bg-primary text-white"
                    : "border-[#C9C6E0] bg-white text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {sentEmail ? (
            <div className="mt-5 rounded-2xl bg-sky-soft p-5">
              <h2 className="font-heading text-lead font-semibold text-ink">ตรวจสอบอีเมลของคุณ</h2>
              <p className="mt-1 text-body text-ink">
                เราส่งลิงก์ยืนยันไปที่{" "}
                <span className="font-semibold [overflow-wrap:anywhere]">{email}</span>{" "}
                เมื่อกดยืนยันแล้วกลับมาเข้าสู่ระบบได้เลย
              </p>
              <button
                type="button"
                onClick={handleGuest}
                className="meadow-btn-secondary tap mt-4 w-full"
              >
                เข้าแบบผู้เยี่ยมชมก่อน
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              {tab === "signup" && (
                <div>
                  <label htmlFor="auth-name" className={fieldLabel}>
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    id="auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                    className={fieldInput}
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className={fieldLabel}>
                  อีเมล
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={fieldInput}
                />
              </div>
              <div>
                <label htmlFor="auth-password" className={fieldLabel}>
                  รหัสผ่าน <span className="font-normal text-ink-soft">(อย่างน้อย 6 ตัวอักษร)</span>
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                  className={fieldInput}
                />
              </div>

              <button type="submit" disabled={busy} className="meadow-btn-primary tap w-full">
                {tab === "signup" ? (
                  <UserPlus className="h-6 w-6" aria-hidden />
                ) : (
                  <LogIn className="h-6 w-6" aria-hidden />
                )}
                {busy ? "กำลังดำเนินการ…" : tab === "signup" ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
              </button>
            </form>
          )}

          <div className="my-5 flex items-center gap-3 text-body text-ink-soft">
            <span className="h-px flex-1 bg-[#E6E3F2]" aria-hidden />
            หรือ
            <span className="h-px flex-1 bg-[#E6E3F2]" aria-hidden />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="meadow-btn-secondary tap w-full gap-3"
          >
            <GoogleMark />
            เข้าสู่ระบบด้วย Google
          </button>

          <button
            type="button"
            onClick={handleGuest}
            className="meadow-btn-secondary tap mt-3 w-full"
          >
            <Sparkles className="h-6 w-6 text-primary" aria-hidden />
            เริ่มเลย แบบผู้เยี่ยมชม
          </button>

          <p className="mt-4 text-center text-body text-ink-soft">
            ผู้เยี่ยมชมใช้ข้อมูลในเครื่องนี้ ผูกบัญชีภายหลังได้
          </p>
        </section>

        <section aria-label="ทำไมต้องมีบัญชี" className="meadow-card p-5">
          <ul className="flex flex-col gap-3 text-body text-ink">
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 shrink-0 text-primary" aria-hidden /> ข้อมูลต่อเนื่อง
            </li>
            <li className="flex items-center gap-3">
              <Link2 className="h-6 w-6 shrink-0 text-primary" aria-hidden /> เชื่อมได้ทุกอุปกรณ์
            </li>
          </ul>
          <Link to="/guide" className="meadow-btn-secondary tap mt-4 w-full">
            รู้จัก คนส. Connexts
          </Link>
        </section>
      </div>
    </EntryShell>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.86Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

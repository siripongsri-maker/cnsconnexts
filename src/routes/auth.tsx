import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { LogIn, UserPlus, Sparkles, Mail, Lock, User as UserIcon, Link2, ShieldCheck, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — คนส. Connexts" },
      {
        name: "description",
        content: "เข้าสู่ระบบ สมัครสมาชิก หรือเข้าใช้แบบผู้เยี่ยมชม เพื่อเริ่มเชื่อมพลังกับเครือข่าย คนส.",
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
  const alreadyLinked = Boolean(me?.linked_email);

  useEffect(() => {
    if (me?.name && !name) setName(me.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.name]);

  useEffect(() => {
    if (mode !== "user" || !user) return;
    if (me && !me.linked_user_id && linkRef.current) {
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
    toast.success("เข้าใช้แบบผู้เยี่ยมชมแล้ว");
    void navigate({ to: "/onboarding" });
  }

  return (
    <div className="min-h-screen bg-background px-5 pb-16 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="text-[13px] font-semibold text-muted-foreground">
          ← กลับหน้าแรก
        </Link>

        <div className="mt-6">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-primary">คนส.</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Connexts</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            เข้าสู่ระบบเพื่อเก็บข้อมูลของคุณไว้ข้ามอุปกรณ์ หรือเข้าใช้แบบผู้เยี่ยมชมได้ทันที
          </p>
        </div>


        {hasLocalProfile && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-lg">
                {me?.photo ? (
                  <img src={me.photo} alt="" className="h-9 w-9 rounded-xl object-cover" />
                ) : (
                  (me?.avatar ?? "✨")
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold">พบโปรไฟล์เดิมในเครื่องนี้: {me?.name}</p>
                {alreadyLinked ? (
                  <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    เชื่อมกับบัญชี {me?.linked_email} แล้ว
                  </p>
                ) : (
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    เชื่อมโปรไฟล์นี้เข้ากับบัญชีอีเมล เพื่อไม่ให้ข้อมูล การเชื่อมต่อ และคำมั่นสัญญาของคุณหาย
                  </p>
                )}
              </div>
            </div>

            {!alreadyLinked && (
              <button
                type="button"
                onClick={() => setLinkGuest((v) => !v)}
                aria-pressed={linkGuest}
                className="tap mt-3 flex w-full items-center gap-3 rounded-xl bg-background/70 px-3 py-2.5 text-left"
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                    linkGuest ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {linkGuest && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="text-[13px] font-semibold">
                  <Link2 className="mr-1 inline h-4 w-4 text-primary" />
                  เชื่อมโปรไฟล์เดิมเข้ากับบัญชีที่เข้าสู่ระบบ (แนะนำ)
                </span>
              </button>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-accent p-1">
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
              className={`tap rounded-xl py-2.5 text-[14px] font-bold transition-colors ${
                tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {sentEmail ? (
          <div className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
            <h2 className="text-[16px] font-bold">ตรวจสอบอีเมลของคุณ</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              เราส่งลิงก์ยืนยันไปที่ <span className="font-semibold text-foreground">{email}</span>{" "}
              เมื่อกดยืนยันแล้วกลับมาเข้าสู่ระบบได้เลย
            </p>
            <button
              type="button"
              onClick={handleGuest}
              className="tap mt-4 w-full rounded-xl bg-accent py-3 text-[14px] font-bold"
            >
              ยังไม่สะดวก — เข้าใช้แบบผู้เยี่ยมชมก่อน
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {tab === "signup" && (
              <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
                <UserIcon className="h-[18px] w-[18px] text-muted-foreground" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล"
                  required
                  className="w-full bg-transparent text-[15px] outline-none"
                />
              </label>
            )}
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
              <Mail className="h-[18px] w-[18px] text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="อีเมล"
                required
                autoComplete="email"
                className="w-full bg-transparent text-[15px] outline-none"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
              <Lock className="h-[18px] w-[18px] text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                required
                minLength={6}
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                className="w-full bg-transparent text-[15px] outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-bold text-primary-foreground disabled:opacity-60"
            >
              {tab === "signup" ? (
                <UserPlus className="h-[18px] w-[18px]" />
              ) : (
                <LogIn className="h-[18px] w-[18px]" />
              )}
              {tab === "signup" ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
            </button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-[12px] font-semibold text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          หรือ
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="tap flex w-full items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card py-3.5 text-[15px] font-bold disabled:opacity-60"
        >
          <GoogleMark />
          เข้าสู่ระบบด้วย Google
        </button>

        <button
          type="button"
          onClick={handleGuest}
          className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-[15px] font-bold"
        >
          <Sparkles className="h-[18px] w-[18px] text-primary" />
          เข้าใช้แบบผู้เยี่ยมชม (Guest)
        </button>

        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          โหมดผู้เยี่ยมชมจะเก็บข้อมูลไว้ในเครื่องนี้เท่านั้น — เข้าสู่ระบบด้วยอีเมลภายหลังเพื่อเชื่อมโปรไฟล์เดิมไว้กับบัญชีได้
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
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

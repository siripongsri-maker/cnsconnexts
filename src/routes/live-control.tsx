import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Lock, LogOut } from "lucide-react";

import { useAdminAuth } from "@/lib/admin-auth";
import { publishControl } from "@/lib/live-control-channel";
import { DEFAULT_CONTROL_STATE, type LiveControlState, type Speed } from "@/lib/live-controls";
import type { TourGroupKey } from "@/lib/live-map-layout";
import { issueTh, REGION_LABEL } from "@/lib/i18n";
import { ISSUES } from "@/lib/types";

export const Route = createFileRoute("/live-control")({
  head: () => ({
    meta: [
      { title: "ควบคุมจอสด — คนส. Connexts" },
      { name: "description", content: "หน้าควบคุมจอสดสำหรับผู้ดูแลงาน" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LiveControlPage,
});

const SPEEDS: { value: Speed; label: string }[] = [
  { value: "slow", label: "ช้า" },
  { value: "normal", label: "ปกติ" },
  { value: "fast", label: "เร็ว" },
];

const GROUPS: { value: TourGroupKey; label: string }[] = [
  { value: "north", label: REGION_LABEL.North },
  { value: "northeast", label: REGION_LABEL.Northeast },
  { value: "central", label: REGION_LABEL.Central },
  { value: "south", label: REGION_LABEL.South },
];

function LiveControlPage() {
  const { ready, authed, user, signIn, signOut } = useAdminAuth();

  if (!ready) {
    return (
      <div className="admin-loading" role="status">
        <span />
        กำลังเชื่อมต่อระบบ…
      </div>
    );
  }

  if (!authed) return <LoginPrompt signIn={signIn} />;

  return <Controls user={user} onSignOut={signOut} />;
}

function LoginPrompt({
  signIn,
}: {
  signIn: (user: string, password: string) => Promise<string | null>;
}) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (signingIn) return;
          setSigningIn(true);
          const err = await signIn(user, password);
          setSigningIn(false);
          if (err) setError(err);
          else setPassword("");
        }}
        className="space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5" aria-hidden="true" />
          <h1 className="text-xl font-bold">เข้าสู่ระบบผู้ดูแลเพื่อควบคุมจอสด</h1>
        </div>
        <label className="block space-y-1">
          <span className="text-body font-bold text-foreground">ชื่อผู้ใช้</span>
          <input
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              setError(null);
            }}
            autoComplete="username"
            className="text-body w-full rounded-xl border border-border bg-background px-3 py-2 outline-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-body font-bold text-foreground">รหัสผ่าน</span>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            autoComplete="current-password"
            className="text-body w-full rounded-xl border border-border bg-background px-3 py-2 outline-none"
          />
        </label>
        {error && (
          <p role="alert" className="text-body font-bold text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={signingIn}
          className="h-12 w-full rounded-xl bg-primary px-4 text-[17px] font-medium text-primary-foreground disabled:opacity-60"
        >
          {signingIn ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
        </button>
        <Link
          to="/admin"
          className="text-body flex min-h-11 items-center justify-center font-bold text-muted-foreground"
        >
          ไปหน้าหลังบ้าน
        </Link>
      </form>
    </main>
  );
}

function Controls({ user, onSignOut }: { user: string | null; onSignOut: () => void }) {
  // Copy so DEFAULT_CONTROL_STATE (and its shared view object) is never mutated.
  const [state, setState] = useState<LiveControlState>(() => ({
    ...DEFAULT_CONTROL_STATE,
    view: { ...DEFAULT_CONTROL_STATE.view },
  }));
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback((patch: Partial<LiveControlState>) => {
    const next: LiveControlState = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setState(next);
    publishControl(next);
  }, []);

  // A reloaded big screen starts at the defaults; re-send the current state when the
  // operator comes back to this window.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const republish = () => {
      if (document.visibilityState === "visible") publishControl(stateRef.current);
    };
    window.addEventListener("focus", republish);
    document.addEventListener("visibilitychange", republish);
    return () => {
      window.removeEventListener("focus", republish);
      document.removeEventListener("visibilitychange", republish);
    };
  }, []);

  const viewKey = state.view.kind === "country" ? "country" : state.view.group;

  return (
    <main id="main-content" className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">ควบคุมจอสด</h1>
        <div className="flex items-center gap-3 text-body text-muted-foreground">
          {user && <span>{user}</span>}
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4"
          >
            <LogOut className="size-4" aria-hidden="true" />
            ออกจากระบบ
          </button>
        </div>
      </header>

      <Group label="ความเร็ว">
        {SPEEDS.map((s) => (
          <Choice
            key={s.value}
            active={state.speed === s.value}
            onClick={() => update({ speed: s.value })}
          >
            {s.label}
          </Choice>
        ))}
      </Group>

      <Group label="มุมมอง">
        <Choice
          active={viewKey === "country"}
          onClick={() => update({ view: { kind: "country" } })}
        >
          ทั้งประเทศ
        </Choice>
        {GROUPS.map((g) => (
          <Choice
            key={g.value}
            active={viewKey === g.value}
            onClick={() => update({ view: { kind: "region", group: g.value } })}
          >
            {g.label}
          </Choice>
        ))}
      </Group>

      <Group label="ประเด็น">
        <Choice active={state.issue === null} onClick={() => update({ issue: null })}>
          ทั้งหมด
        </Choice>
        {ISSUES.map((issue) => (
          <Choice key={issue} active={state.issue === issue} onClick={() => update({ issue })}>
            {issueTh(issue)}
          </Choice>
        ))}
      </Group>

      <Group label="การเคลื่อนไหว">
        <Choice active={state.motion === "moving"} onClick={() => update({ motion: "moving" })}>
          เคลื่อนไหว
        </Choice>
        <Choice active={state.motion === "still"} onClick={() => update({ motion: "still" })}>
          นิ่ง
        </Choice>
      </Group>

      <Group label="ฟองชื่อ">
        <Choice active={state.bubbles} onClick={() => update({ bubbles: true })}>
          เปิด
        </Choice>
        <Choice active={!state.bubbles} onClick={() => update({ bubbles: false })}>
          ปิด
        </Choice>
      </Group>
    </main>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section role="group" aria-label={label} className="space-y-3">
      <h2 className="text-lg font-bold">{label}</h2>
      <div className="flex flex-wrap gap-3">{children}</div>
    </section>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-14 min-w-24 rounded-2xl border-2 px-5 text-lg font-bold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}

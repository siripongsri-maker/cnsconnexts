import { Link } from "@tanstack/react-router";
import { Home, Bell, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Wordmark } from "@/components/wordmark";
import { Avatar } from "@/components/power-bits";
import { SponsorFooter } from "@/components/sponsor-footer";
import { BottomNav } from "@/components/bottom-nav";
import { PendingSyncBanner } from "@/components/pending-sync-banner";
import type { ReactNode } from "react";

export function AppShell({
  children,
  title,
  titleEn,
  subtitle,
  action,
}: {
  children: ReactNode;
  title?: string;
  /** ชื่อหน้าภาษาอังกฤษสั้น ๆ แสดงข้างโลโก้ (เช่น "People You Should Meet") */
  titleEn?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { mode } = useAuth();
  const { notifications, me } = useStore();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen pb-24">
      {title && (
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 px-5 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <Link
              to="/"
              className="tap relative inline-grid h-10 w-10 after:absolute after:-inset-1 after:content-[''] shrink-0 place-items-center rounded-full bg-accent text-foreground"
              aria-label="กลับหน้าแรก"
            >
              <Home className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <Link to="/" className="block shrink-0" aria-label="คนส. Connexts">
                  <Wordmark size="xs" withMark />
                </Link>
                {titleEn && (
                  <span lang="en" className="truncate text-xs font-semibold text-muted-foreground">
                    · {titleEn}
                  </span>
                )}
              </div>
              <h1 className="line-clamp-2 break-words text-[17px] font-extrabold leading-tight tracking-tight sm:text-xl">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/notifications"
                className="tap relative inline-grid h-10 w-10 after:absolute after:-inset-1 after:content-[''] place-items-center rounded-full bg-accent text-foreground"
                aria-label={unread > 0 ? `การแจ้งเตือน ${unread} รายการใหม่` : "การแจ้งเตือน"}
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
                {unread > 0 && (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-coral-ink px-1 text-xs font-extrabold text-white"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              {me ? (
                <Link
                  to="/update"
                  className="tap relative inline-grid h-10 w-10 after:absolute after:-inset-1 after:content-[''] place-items-center rounded-full"
                  aria-label="พลังของฉัน · My Power Profile"
                >
                  <span aria-hidden className="block h-10 w-10 overflow-hidden rounded-full">
                    <Avatar user={me} size={40} />
                  </span>
                </Link>
              ) : (
                <Link
                  to={mode === "anon" ? "/onboarding" : "/update"}
                  className="tap relative inline-grid h-10 w-10 after:absolute after:-inset-1 after:content-[''] place-items-center rounded-full bg-accent text-foreground"
                  aria-label="สร้างโปรไฟล์พลัง · Create my Power Profile"
                >
                  <UserRound className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
                </Link>
              )}
            </div>
          </div>
          {subtitle && (
            <p className="mt-1.5 line-clamp-2 break-words text-[12.5px] leading-snug text-muted-foreground">
              {subtitle}
            </p>
          )}
          {action && <div className="mt-2.5 flex flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <PendingSyncBanner />
      <main className="mx-auto w-full max-w-xl">{children}</main>

      <div className="mx-auto w-full max-w-xl px-5">
        <SponsorFooter />
      </div>

      <BottomNav />
    </div>
  );
}

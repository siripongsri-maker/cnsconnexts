import { Link } from "@tanstack/react-router";
import { Home, LogIn, LogOut, Bell } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Wordmark } from "@/components/wordmark";
import { SponsorFooter } from "@/components/sponsor-footer";
import { BottomNav } from "@/components/bottom-nav";
import type { ReactNode } from "react";

export function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { mode, signOut } = useAuth();
  const { notifications } = useStore();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {title && (
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 px-5 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <Link
              to="/"
              className="tap inline-grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-foreground"
              aria-label="กลับหน้าแรก"
            >
              <Home className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to="/" className="block min-w-0" aria-label="คนส. Connexts">
                <Wordmark size="xs" withMark />
              </Link>
              <h1 className="line-clamp-2 break-words text-[17px] font-extrabold leading-tight tracking-tight sm:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-[12.5px] text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {action}
              <Link
                to="/notifications"
                className="tap relative inline-grid h-9 w-9 place-items-center rounded-full bg-accent text-foreground"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={2.2} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-extrabold text-coral-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              {mode === "user" || mode === "guest" ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="tap inline-grid h-9 w-9 place-items-center rounded-full bg-accent text-foreground"
                  aria-label="ออกจากระบบ"
                >
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="tap inline-grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"
                  aria-label="เข้าสู่ระบบ"
                >
                  <LogIn className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </Link>
              )}
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-xl">{children}</main>

      <div className="mx-auto w-full max-w-xl px-5">
        <SponsorFooter />
      </div>

      <BottomNav />

    </div>
  );
}

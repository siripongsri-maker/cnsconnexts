import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Bell, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/power-bits";
import { SponsorFooter } from "@/components/sponsor-footer";
import { BottomNav } from "@/components/bottom-nav";
import { SpaceNav } from "@/components/space-nav";
import { PendingSyncBanner } from "@/components/pending-sync-banner";
import { MissionHeader, type MissionVariant } from "@/components/mission-ui";
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
  /** ชื่อหน้าภาษาอังกฤษสั้น ๆ แสดงเหนือหัวเรื่อง */
  titleEn?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { mode } = useAuth();
  const { notifications, me } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = notifications.filter((n) => !n.read).length;
  const page = PAGE_IDENTITY[pathname] ?? {
    kicker: titleEn ?? "Connecting power",
    number: "01",
    variant: "network" as const,
  };

  // Admin pages already sit inside their own authenticated navigation and masthead.
  if (pathname.startsWith("/admin")) {
    return (
      <section className="admin-embedded-page">
        {subtitle && <p className="mission-page-description">{subtitle}</p>}
        {action && <div className="mission-page-actions">{action}</div>}
        {children}
      </section>
    );
  }

  return (
    <div className={`app-shell mission-app-${page.variant} min-h-screen pb-24`}>
      <SpaceNav />
      {title && (
        <div className="mission-heading-wrap">
          <MissionHeader
            kicker={titleEn ?? page.kicker}
            title={title}
            description={subtitle}
            number={page.number}
            variant={page.variant}
          >
            {action}
          </MissionHeader>
          <div className="mission-account-tools flex items-center gap-2">
            <Link
              to="/notifications"
              className="tap relative inline-grid h-10 w-10 after:absolute after:-inset-1 after:content-[''] place-items-center rounded-full bg-accent text-foreground"
              aria-label={unread > 0 ? `การแจ้งเตือน ${unread} รายการใหม่` : "การแจ้งเตือน"}
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
              {unread > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-coral-ink px-1 text-xs font-extrabold text-coral-foreground"
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
      )}
      <nav className="mission-route-rail" aria-label="เส้นทางเชื่อมพลัง">
        {JOURNEY_LINKS.map((step, index) => (
          <Link
            key={step.to}
            to={step.to}
            className="mission-route-stop"
            activeProps={{ className: "mission-route-stop is-active", "aria-current": "page" }}
          >
            <span lang="en">0{index + 1}</span>
            <span>{step.label}</span>
            <ArrowUpRight aria-hidden="true" size={14} />
          </Link>
        ))}
      </nav>
      <PendingSyncBanner />
      <main id="main-content" className="app-content mx-auto w-full max-w-5xl">
        {children}
      </main>

      <div className="mission-app-footer">
        <div>
          <p className="mission-kicker" lang="en">
            People. Ideas. Action.
          </p>
          <p>ต่างพื้นที่ เชื่อมพลังเดียวกัน</p>
          <Link to="/guide">
            คู่มือใช้งาน <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <SponsorFooter />
      </div>

      <BottomNav />
    </div>
  );
}

const JOURNEY_LINKS = [
  { to: "/matches", label: "เจอคนที่ใช่" },
  { to: "/map", label: "สำรวจเครือข่าย" },
  { to: "/marketplace", label: "แลกไอเดีย" },
  { to: "/commitments", label: "ลงมือด้วยกัน" },
] as const;

const PAGE_IDENTITY: Record<string, { kicker: string; number: string; variant: MissionVariant }> = {
  "/matches": { kicker: "Discover", number: "01", variant: "profile" },
  "/map": { kicker: "The network", number: "02", variant: "network" },
  "/marketplace": { kicker: "Ideas in orbit", number: "03", variant: "archive" },
  "/commitments": { kicker: "Make it happen", number: "04", variant: "action" },
  "/calendar": { kicker: "Plan together", number: "04", variant: "action" },
  "/dashboard": { kicker: "Collective power", number: "05", variant: "signal" },
  "/notifications": { kicker: "Your signals", number: "06", variant: "signal" },
  "/update": { kicker: "Your power profile", number: "07", variant: "profile" },
  "/submit": { kicker: "Share your impact", number: "08", variant: "archive" },
  "/ebook": { kicker: "Our shared work", number: "09", variant: "archive" },
  "/guide": { kicker: "Your mission guide", number: "10", variant: "network" },
};

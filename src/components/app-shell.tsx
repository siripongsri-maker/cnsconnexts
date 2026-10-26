import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Bell, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/power-bits";
import { SponsorFooter } from "@/components/sponsor-footer";
import { BOTTOM_NAV_HEIGHT_VAR, BottomNav } from "@/components/bottom-nav";
import { PendingSyncBanner } from "@/components/pending-sync-banner";
import { Wordmark } from "@/components/wordmark";
import type { ReactNode } from "react";

/** คอลัมน์เดียวกันทั้งหัว เนื้อหา และท้ายหน้า — มือถือ max-w-xl, จอ ≥ 1024px กลางจอ max-w-3xl */
const COLUMN = "mx-auto w-full max-w-xl px-4 lg:max-w-3xl";

/**
 * เว้นท้ายหน้าเท่าความสูงจริงของเมนูล่าง (ค่าที่ BottomNav วัดแล้ว รวม safe area) + ที่หายใจ
 * ค่าสำรองก่อนวัดเสร็จ = เมนู 77px + safe area (ค่าเดียวกับแถบปุ่มของสำรับ)
 */
const CONTENT_BOTTOM_PADDING = `calc(var(${BOTTOM_NAV_HEIGHT_VAR}, calc(77px + env(safe-area-inset-bottom))) + 1.5rem + var(--pdpa-height, 0px))`;

/**
 * โครงหน้าผู้เข้าร่วมทุกหน้า (ยกเว้นหน้าแรกที่เรนเดอร์หัวเอง) — แถบหัวสีฟ้าอ่อน: โลโก้ซ้าย กระดิ่ง + โปรไฟล์ขวา
 * ใต้แถบเป็น H1 (+ คำอธิบาย + ปุ่มของหน้า) แล้วตามด้วยเนื้อหา ท้ายหน้ามีผู้สนับสนุนกับลิงก์คู่มือ
 * เมนูนำทางมีแค่เมนูล่าง 4 อย่างบนทุกความกว้างจอ
 */
export function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title?: string;
  /** ไม่แสดงบนหน้าผู้เข้าร่วมแล้ว (ธีมทุ่งไม่มีป้ายอังกฤษเล็ก) — คงพร็อพไว้ให้หน้าเดิมคอมไพล์ผ่าน */
  titleEn?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { mode } = useAuth();
  const { notifications, me } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = notifications.filter((n) => !n.read).length;

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
    <div className="min-h-dvh" style={{ paddingBottom: CONTENT_BOTTOM_PADDING }}>
      <header className="bg-sky-soft">
        <div
          className={`${COLUMN} flex items-center justify-between gap-3 pt-[max(0.5rem,env(safe-area-inset-top))]`}
        >
          <Link
            to="/"
            aria-label="คนส. Connexts หน้าแรก"
            className="tap inline-flex min-h-12 min-w-0 items-center rounded-xl"
          >
            <Wordmark size="header" withMark />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/notifications"
              aria-label={unread > 0 ? `การแจ้งเตือน ${unread} รายการใหม่` : "การแจ้งเตือน"}
              className="tap relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_6px_16px_-10px_rgba(43,40,120,0.45)]"
            >
              <Bell className="h-7 w-7" strokeWidth={2.2} aria-hidden />
              {unread > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-2 grid h-7 min-w-7 place-items-center rounded-full bg-primary px-1.5 text-body font-semibold leading-none text-white"
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            {me ? (
              <Link
                to="/update"
                aria-label="โปรไฟล์ของฉัน"
                className="tap grid h-12 w-12 shrink-0 place-items-center rounded-full max-[364px]:hidden"
              >
                <span
                  aria-hidden
                  className="block h-12 w-12 overflow-hidden rounded-full ring-2 ring-white shadow-[0_6px_16px_-10px_rgba(43,40,120,0.45)]"
                >
                  <Avatar user={me} size={48} />
                </span>
              </Link>
            ) : (
              <Link
                to={mode === "anon" ? "/onboarding" : "/update"}
                aria-label="สร้างโปรไฟล์ของฉัน"
                className="tap grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_6px_16px_-10px_rgba(43,40,120,0.45)] max-[364px]:hidden"
              >
                <UserRound className="h-7 w-7" strokeWidth={2.2} aria-hidden />
              </Link>
            )}
          </div>
        </div>

        {title && (
          <div className={`${COLUMN} pb-5 pt-3`}>
            <h1 className="font-heading text-display font-bold text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-body text-ink-soft">{subtitle}</p>}
            {action && <div className="mt-4 flex flex-wrap items-center gap-3">{action}</div>}
          </div>
        )}
      </header>

      <PendingSyncBanner />

      {/*
        app-content ยังต้องอยู่: เนื้อหาหน้าเดิมอ้าง `.app-content …` ใน CSS ของหน้านั้น ๆ
        แต่กฎกว้าง/ระยะขอบของมันอยู่นอก @layer จึงชนะ utility — ใช้ ! ทับให้คอลัมน์ตรงกับแถบหัว
      */}
      <main
        id="main-content"
        className="app-content mx-auto w-full! max-w-xl px-4! pt-5! lg:max-w-3xl"
      >
        {children}
      </main>

      <div className={`${COLUMN} mt-8 flex flex-col items-center`}>
        <SponsorFooter className="pb-4" />
        <Link
          to="/guide"
          className="tap inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-body font-semibold text-primary underline underline-offset-4"
        >
          คู่มือใช้งาน
          <ArrowUpRight className="h-6 w-6" aria-hidden />
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}

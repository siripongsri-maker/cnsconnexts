import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, Home, Lock, LogOut } from "lucide-react";

import { ROLE_TH, useAdminAuth } from "@/lib/admin-auth";
import { ADMIN_NAV_GROUPS } from "@/lib/admin-nav";
import { AdminTitleNoteContext } from "@/components/admin/page-head";
import { Button } from "@/components/ui/button";
import { MeadowScene } from "@/components/meadow-scene";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "หลังบ้านผู้ดูแล — คนส. Connexts" },
      {
        name: "description",
        content:
          "ระบบหลังบ้านสำหรับผู้ดูแลงาน จัดการสมาชิก ไอเดีย ผลงาน คู่เชื่อม และข้อมูลกิจกรรมทั้งหมด",
      },
      { property: "og:title", content: "หลังบ้านผู้ดูแล — คนส. Connexts" },
      { property: "og:description", content: "จัดการข้อมูลกิจกรรมทั้งหมดในที่เดียว" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

/** Page titles for the shared head row and the topbar breadcrumb. */
const ADMIN_PAGES = [
  { path: "/admin", title: "ภาพรวมของเครือข่าย" },
  { path: "/admin/people", title: "รายชื่อสมาชิก" },
  { path: "/admin/import", title: "นำเข้ารายชื่อ" },
  { path: "/admin/ideas", title: "แลกเปลี่ยนไอเดีย" },
  { path: "/admin/submissions", title: "คลังผลงาน" },
  { path: "/admin/map", title: "เครือข่ายรายพื้นที่" },
  { path: "/admin/connections", title: "คู่เชื่อมในเครือข่าย" },
  { path: "/admin/commitments", title: "ติดตามคำมั่น" },
  { path: "/admin/live", title: "จอสดของงาน" },
  { path: "/admin/qr", title: "QR และรหัสห้อง" },
  { path: "/admin/logs", title: "การใช้งานของผู้เข้าร่วม" },
  { path: "/admin/login-history", title: "ประวัติการเข้าสู่ระบบ" },
  { path: "/admin/backups", title: "สำรองและกู้คืนข้อมูล" },
  { path: "/admin/backup-policy", title: "นโยบายการเก็บข้อมูลสำรอง" },
  { path: "/admin/audit", title: "ประวัติการแก้ไข" },
  { path: "/admin/export", title: "ส่งออกข้อมูล" },
  { path: "/admin/costs", title: "สรุปค่าใช้จ่าย" },
  { path: "/admin/settings", title: "ตั้งค่าระบบ" },
] as const;

function AdminLayout() {
  const { ready, authed, role, user: adminUser, signIn, signOut, signInGoogle, googleError } = useAdminAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [titleNote, setTitleNote] = useState<string | null>(null);
  const pathname = useRouterState({
    select: (state) => state.location.pathname.replace(/\/$/, ""),
  });
  const pageIndex = Math.max(
    0,
    ADMIN_PAGES.findIndex((page) => page.path === pathname),
  );
  const page = ADMIN_PAGES[pageIndex] ?? ADMIN_PAGES[0];

  useEffect(() => {
    if (!ready || !authed) return;
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[data-admin-active="true"]');
    if (!active) return;
    if (!window.matchMedia("(max-width: 1099px)").matches) {
      // Wide screens: the menu is a tall list that scrolls inside the sidebar; keep the open page in view.
      const listBounds = nav.getBoundingClientRect();
      const row = active.getBoundingClientRect();
      if (row.top < listBounds.top) nav.scrollTop += row.top - listBounds.top - 8;
      else if (row.bottom > listBounds.bottom) nav.scrollTop += row.bottom - listBounds.bottom + 8;
      return;
    }
    if (nav.scrollWidth <= nav.clientWidth) return;
    const bounds = nav.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    let left = nav.scrollLeft;
    if (item.left < bounds.left + 8) left += item.left - bounds.left - 8;
    else if (item.right > bounds.right - 8) left += item.right - bounds.right + 8;
    else return;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.hasAttribute("data-lowspec");
    nav.scrollTo({
      left: Math.max(0, Math.min(left, nav.scrollWidth - nav.clientWidth)),
      behavior: reduced ? "auto" : "smooth",
    });
  }, [pathname, ready, authed]);

  if (!ready) {
    return (
      <div className="admin-loading" role="status">
        <span />
        กำลังเชื่อมต่อระบบ…
      </div>
    );
  }

  if (!authed) {
    return (
      <main id="main-content" className="admin-login">
        <section className="admin-login-story" aria-labelledby="admin-login-title">
          <MeadowScene variant="celebrate" className="admin-login-scene" />
          <Link to="/" aria-label="คนส. Connexts กลับหน้าแรก" className="admin-brand">
            <Wordmark size="header" withMark />
          </Link>
          <div className="admin-login-copy">
            <h1 id="admin-login-title">หลังบ้าน คนส. CoNnextS</h1>
            <p>ดูแลข้อมูลและผู้เข้าร่วมของงานสมัชชาสุขภาพครั้งที่ 19</p>
          </div>
        </section>
        <section className="admin-login-access" aria-labelledby="admin-access-title">
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
            className="admin-login-form space-y-6"
          >
            <div className="admin-access-heading">
              <span className="admin-access-icon">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 id="admin-access-title">เข้าสู่ระบบผู้ดูแล</h2>
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

            {(error || googleError) && (
              <p role="alert" className="text-body font-bold text-destructive">
                {error || googleError}
              </p>
            )}

            <Button
              type="submit"
              disabled={signingIn}
              variant="mission"
              className="tap h-12 w-full justify-between rounded-xl bg-primary px-[18px] text-[17px] font-medium text-primary-foreground"
            >
              {signingIn ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}{" "}
              <ArrowRight className="ml-auto size-4" aria-hidden="true" />
            </Button>

            <Button type="button" variant="outline" className="h-12 w-full" disabled={signingIn} onClick={async () => {
              setSigningIn(true); setError(null);
              try { setError(await signInGoogle()); } catch { setError('เข้าสู่ระบบ Google ไม่สำเร็จ กรุณาลองใหม่'); }
              finally { setSigningIn(false); }
            }}>เข้าสู่ระบบด้วย Google</Button>
            <p className="text-body text-muted-foreground">Superadmin: srichausiripong@gmail.com · เข้าด้วย Google เท่านั้น</p>

            <details className="admin-role-note">
              <summary>
                สิทธิ์ของแต่ละบทบาท
                <ChevronDown className="admin-role-note-chevron size-5" aria-hidden="true" />
              </summary>
              <p>
                <b>ผู้ดูแลสูงสุด</b> ดู ค้นหา ส่งออก และล้าง Log
                <br />
                <b>นักวิเคราะห์</b> ดู ค้นหา และส่งออก
                <br />
                <b>ผู้ชม</b> ดูข้อมูล
              </p>
            </details>

            <Link
              to="/"
              className="text-body flex min-h-11 items-center justify-center font-bold text-muted-foreground"
            >
              ← กลับหน้าแรก
            </Link>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-experience">
      <a href="#main-content" className="mission-skip">
        ข้ามไปเนื้อหา
      </a>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-inner">
          <Link to="/" aria-label="คนส. Connexts กลับหน้าแรก" className="admin-logo">
            <Wordmark size="header" withMark />
          </Link>
          <div className="admin-brand-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <nav ref={navRef} aria-label="เมนูผู้ดูแล" className="admin-nav" data-lenis-prevent>
            {ADMIN_NAV_GROUPS.map((group, groupIndex) => (
              <div
                key={group.label}
                role="group"
                aria-labelledby={`admin-nav-group-${groupIndex}`}
                className="admin-nav-group"
              >
                <p id={`admin-nav-group-${groupIndex}`} className="admin-nav-label">
                  {group.label}
                </p>
                {group.items.map(({ to, label, icon: Icon, exact }) => (
                  <Link
                    key={to}
                    to={to}
                    activeOptions={{ exact: Boolean(exact) }}
                    activeProps={{ className: "is-active" }}
                    data-admin-active={pathname === to ? "true" : undefined}
                    className="admin-nav-link tap"
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <Link to="/" className="admin-return">
            <Home className="size-5" aria-hidden="true" />
            กลับหน้าบ้าน
            <ArrowUpRight className="ml-auto size-5" aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className="admin-stage">
        <header className="admin-topbar">
          <p className="admin-topbar-name">
            <span aria-hidden="true" />
            หลังบ้าน<span className="admin-topbar-separator">/</span>
            <span>{page.title}</span>
          </p>
          <div className="admin-session">
            <span className="admin-session-user">{adminUser ?? "-"}</span>
            <span className="admin-role-chip">{role ? ROLE_TH[role] : "-"}</span>
            <Button
              type="button"
              onClick={signOut}
              variant="outline"
              className="admin-sign-out tap"
            >
              <LogOut className="size-4" aria-hidden="true" /> ออกจากระบบ
            </Button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="admin-main">
          <header className="admin-page-head">
            <h1>
              {page.title}
              {titleNote ? <span className="admin-page-head-note"> {titleNote}</span> : null}
            </h1>
          </header>
          <div
            className={`admin-content admin-page-${page.path === "/admin" ? "overview" : page.path.split("/").at(-1)}`}
          >
            <AdminTitleNoteContext.Provider value={setTitleNote}>
              <Outlet />
            </AdminTitleNoteContext.Provider>
          </div>
        </main>
      </div>
    </div>
  );
}

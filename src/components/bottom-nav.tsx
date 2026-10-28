import { useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, HeartHandshake, Compass, FolderOpen, CircleUserRound } from "lucide-react";

/**
 * เมนูล่าง 5 อย่าง — match คือเส้นทางที่นับว่าอยู่ในหมวดนี้
 * (คำเมนูใช้ 16px แทน text-body ของธีม ทังน้ีเพื่่อ 5 คอลัมณยัังไม่ลนกัันในจอ 360px
 *  และจะยAngular hidden (sr-only) เมื่่อจอกว่าน้อยกว่า 360px)
 */
export const NAV_ITEMS = [
  { to: "/", label: "จับคู่", icon: Sparkles, match: ["/", "/matches", "/people"] },
  {
    to: "/commitments",
    label: "คู่ของฉัน",
    icon: HeartHandshake,
    match: ["/commitments", "/connection", "/chat", "/calendar"],
  },
  { to: "/map", label: "สำรวจ", icon: Compass, match: ["/map", "/marketplace"] },
  { to: "/projects", label: "โปรเจกต์", icon: FolderOpen, match: ["/projects"] },
  {
    to: "/update",
    label: "ฉัน",
    icon: CircleUserRound,
    match: ["/update", "/notifications", "/dashboard"],
  },
] as const;

/** "/" ตรงเฉพาะหน้าแรก ส่วนอื่นตรงทั้ง segment หรือเส้นทางย่อยใต้มัน */
export function isNavActive(pathname: string, match: readonly string[]): boolean {
  return match.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * ความสูงจริงของเมนูล่าง (รวม safe area) เป็นตัวแปร CSS ที่ <html> — ของที่ลอยเหนือเมนู
 * (เช่น แถบปุ่มของสำรับ) ใช้ var(--bottom-nav-height) แทนตัวเลขตายตัว จึงชิดพอดีทุกขนาดจอ
 * (จอ < 360px ซ่อนคำเมนู เมนูเตี้ยลง หรือผู้ใช้ขยายตัวอักษร)
 */
export const BOTTOM_NAV_HEIGHT_VAR = "--bottom-nav-height";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty(BOTTOM_NAV_HEIGHT_VAR, `${nav.offsetHeight}px`);
    publish();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(publish);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      root.style.removeProperty(BOTTOM_NAV_HEIGHT_VAR);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = isNavActive(pathname, match);
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`tap relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center text-[16px] leading-tight font-semibold ${
                  active ? "text-primary" : "text-ink-soft"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-1 rounded-b-full bg-primary"
                  />
                )}
                <Icon
                  className="h-[26px] w-[26px] shrink-0"
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                <span className="max-w-full truncate max-[359px]:sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

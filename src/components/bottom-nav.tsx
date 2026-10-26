import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, HeartHandshake, Compass, CircleUserRound } from "lucide-react";

/** เมนูล่าง 4 อย่าง — match คือเส้นทางที่นับว่าอยู่ในหมวดนี้ (สเปก "เมนูล่าง 4 อย่าง") */
export const NAV_ITEMS = [
  { to: "/", label: "จับคู่", icon: Sparkles, match: ["/", "/matches", "/people"] },
  {
    to: "/commitments",
    label: "คู่ของฉัน",
    icon: HeartHandshake,
    match: ["/commitments", "/connection", "/chat", "/calendar"],
  },
  { to: "/map", label: "สำรวจ", icon: Compass, match: ["/map", "/marketplace"] },
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

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = isNavActive(pathname, match);
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`tap relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center text-body font-semibold${
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
                <span className="whitespace-nowrap max-[359px]:sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, Map, Store, CheckCircle2, Radio } from "lucide-react";

/** ชื่อเมนูตรงกับหัวหน้าเพจ — match คือเส้นทางย่อยที่นับว่าอยู่ในหมวดนี้ */
const NAV = [
  { to: "/matches", label: "คนที่ควรเจอ", icon: Sparkles, match: ["/matches", "/people"] },
  { to: "/map", label: "แผนที่พลัง", icon: Map, match: ["/map"] },
  { to: "/marketplace", label: "ตลาดพลัง", icon: Store, match: ["/marketplace"] },
  {
    to: "/commitments",
    label: "ทำอะไรต่อ",
    icon: CheckCircle2,
    match: ["/commitments", "/connection", "/chat", "/calendar"],
  },
  { to: "/dashboard", label: "สดในงาน", icon: Radio, match: ["/dashboard"] },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="เมนูหลัก"
      className="mission-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-lg lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-between px-2 pt-2">
        {NAV.map(({ to, label, icon: Icon, match }) => {
          const active = match.some((p) => pathname.startsWith(p));
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`tap flex min-h-11 flex-col items-center gap-1 border-t px-1 py-1.5 text-center text-xs font-semibold leading-tight ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <span className="relative grid h-7 w-10 shrink-0 place-items-center">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.6 : 2} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

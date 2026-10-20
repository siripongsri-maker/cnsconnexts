import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, Map, Store, CheckCircle2, Radio } from "lucide-react";

const NAV = [
  { to: "/matches", label: "คู่เชื่อม", icon: Sparkles },
  { to: "/map", label: "แผนที่พลัง", icon: Map },
  { to: "/marketplace", label: "ตลาดนัด", icon: Store },
  { to: "/commitments", label: "ก้าวต่อไป", icon: CheckCircle2 },
  { to: "/dashboard", label: "สด", icon: Radio },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/70 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-xl items-stretch justify-between px-2 pt-2">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`tap flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-xs font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`relative grid h-8 w-12 shrink-0 place-items-center rounded-full transition-all duration-200 ${
                    active
                      ? "bg-primary/12 shadow-[0_0_18px_-4px_oklch(0.51_0.25_296/0.55)] after:absolute after:-top-2 after:h-1 after:w-5 after:rounded-full after:bg-[image:var(--gradient-power)] after:content-['']"
                      : ""
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.6 : 2} />
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

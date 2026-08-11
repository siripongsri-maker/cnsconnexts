import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, Map, Store, CheckCircle2, Radio } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/matches", label: "Matches", icon: Sparkles },
  { to: "/map", label: "Power Map", icon: Map },
  { to: "/marketplace", label: "Market", icon: Store },
  { to: "/commitments", label: "Next", icon: CheckCircle2 },
  { to: "/dashboard", label: "Live", icon: Radio },
] as const;

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-24">
      {title && (
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 px-5 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {action}
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-xl">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <ul className="mx-auto flex max-w-xl items-stretch justify-between px-2 pt-2">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={`tap flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`grid h-8 w-12 shrink-0 place-items-center rounded-full transition-colors ${
                      active ? "bg-primary/12" : ""
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
    </div>
  );
}

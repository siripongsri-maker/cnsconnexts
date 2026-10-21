import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, ListChecks } from "lucide-react";

/** หน้าก้าวต่อไปรวมเป็นหน้าเดียว: สลับมุมมอง รายการ / ปฏิทิน */
export function FollowUpTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/commitments", label: "รายการ", icon: ListChecks },
    { to: "/calendar", label: "ปฏิทิน", icon: CalendarDays },
  ] as const;
  return (
    <div className="core-follow-tabs px-5 pt-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1" role="tablist">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              role="tab"
              aria-selected={active}
              className={`tap inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold ${
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

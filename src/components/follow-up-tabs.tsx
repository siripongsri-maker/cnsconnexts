import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, ListChecks } from "lucide-react";

/** หน้าก้าวต่อไปรวมเป็นหน้าเดียว: สลับมุมมอง รายการ / ปฏิทิน — ปุ่มสูง 56px ตัวอักษร 20px */
export function FollowUpTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/commitments", label: "รายการ", icon: ListChecks },
    { to: "/calendar", label: "ปฏิทิน", icon: CalendarDays },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sky-soft p-1.5" role="tablist">
      {tabs.map(({ to, label, icon: Icon }) => {
        const active = path.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            role="tab"
            aria-selected={active}
            className={`tap inline-flex min-h-14 items-center justify-center gap-2 rounded-xl text-body font-semibold ${
              active ? "bg-primary text-white" : "bg-white text-ink"
            }`}
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

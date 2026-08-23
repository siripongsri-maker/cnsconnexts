import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { logUsage } from "@/lib/usage-log";

/** Logs a page view on each route change (only when consent is granted). */
export function UsageTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    logUsage("page_view", "เข้าชมหน้า", pathname, pathname);
  }, [pathname]);

  return null;
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider, useStore } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "../components/ui/sonner";
import { NotificationHost } from "@/components/notification-host";
import { CommitmentReminders } from "@/components/commitment-reminders";
import { FilterAlerts } from "@/components/filter-alerts";
import { LoadingScreen } from "@/components/loading-screen";
import { GuidedTour } from "@/components/guided-tour";
import { UsageTracker } from "@/components/usage-tracker";
import { CacheRefresher } from "@/components/cache-refresher";
import { useMotionSettings } from "@/lib/motion";

/* ปุ่มแบบสีทึบ (ไม่ใช้เกรเดียนต์) สำหรับหน้าแจ้งปัญหา — สูง 48px กดง่าย */
const BTN_PRIMARY =
  "tap inline-flex h-12 min-w-[44px] items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90";
const BTN_SECONDARY =
  "tap inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-card px-5 text-sm font-bold text-foreground hover:bg-accent";

function NotFoundComponent() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-16">
      <div className="card-soft mx-auto w-full max-w-md rounded-3xl p-6 text-center">
        <h1 className="text-xl font-bold text-foreground">อ๊ะ หาหน้านี้ไม่เจอ</h1>
        <p lang="en" className="mt-1 text-sm text-muted-foreground">
          We couldn't find this page
        </p>
        <p className="mt-4 text-sm text-foreground">
          ลิงก์อาจพิมพ์ผิดหรือหมดอายุแล้ว ไม่เป็นไรนะ ไปดูคนที่คุณน่าจะอยากเจอกันต่อ
        </p>
        <p lang="en" className="mt-1 text-sm text-muted-foreground">
          The link may be mistyped or expired. Let's find people you should meet.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/matches" className={BTN_PRIMARY}>
            <span>
              ไปดูคนที่ควรเจอ · <span lang="en">People to meet</span>
            </span>
          </Link>
          <Link to="/" className={BTN_SECONDARY}>
            <span>
              กลับหน้าแรก · <span lang="en">Home</span>
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="card-soft mx-auto w-full max-w-md rounded-3xl p-6 text-center">
        <div role="alert">
          <h1 className="text-xl font-bold text-foreground">หน้านี้โหลดไม่สำเร็จ</h1>
          <p lang="en" className="mt-1 text-sm text-muted-foreground">
            This page didn't load
          </p>
          <p className="mt-4 text-sm text-foreground">อาจเป็นที่สัญญาณ ลองอีกครั้งได้เลยนะ</p>
          <p lang="en" className="mt-1 text-sm text-muted-foreground">
            It might be the connection. Give it another try.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className={BTN_PRIMARY}
          >
            <span>
              ลองอีกครั้ง · <span lang="en">Try again</span>
            </span>
          </button>
          <a href="/" className={BTN_SECONDARY}>
            <span>
              กลับหน้าแรก · <span lang="en">Home</span>
            </span>
          </a>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "คนส. Connexts — National Health Assembly" },
      {
        name: "description",
        content:
          "Discover who to connect with at Thailand's National Health Assembly. Everyone brings a different kind of power.",
      },
      { name: "theme-color", content: "#6d28d9" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&family=Prompt:wght@500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StoreProvider>
          <HydrationGate>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </HydrationGate>
          <NotificationHost />
          <CommitmentReminders />
          <FilterAlerts />
          <GuidedTour />
          <UsageTracker />
          <CacheRefresher />
          <LowSpecFlag />

          <Toaster position="top-center" />
        </StoreProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** ติดธง data-lowspec ที่ <html> เพื่อให้ CSS ปิดเบลอ/แอนิเมชันตกแต่งบนเครื่องสเปกต่ำ */
function LowSpecFlag() {
  const { lowSpec } = useMotionSettings();
  useEffect(() => {
    document.documentElement.toggleAttribute("data-lowspec", lowSpec);
  }, [lowSpec]);
  return null;
}

/** หน้าที่ไม่ต้องรอข้อมูลจากฐานข้อมูล — สแกน QR แล้วเห็นหน้าทันที */
const OPEN_ROUTES = new Set(["/", "/join", "/guide", "/qr"]);
/** หน้าที่ต้องรอข้อมูลครบก่อนเสมอ (ตัดสินใจพาไปหน้าอื่นจากข้อมูลโปรไฟล์ / หลังบ้าน) */
const ALWAYS_GATED = ["/auth", "/onboarding", "/admin"];
/** ถ้าเน็ตช้า ให้เปิดหน้าได้หลังเวลานี้ แล้วโหลดข้อมูลต่อเบื้องหลัง */
const GATE_TIMEOUT_MS = 2500;

function HydrationGate({ children }: { children: ReactNode }) {
  const { hydrated, booted } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [waitedEnough, setWaitedEnough] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    const t = setTimeout(() => setWaitedEnough(true), GATE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [hydrated]);

  if (hydrated || OPEN_ROUTES.has(pathname)) return children;
  const gatedAlways = ALWAYS_GATED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  // อ่านข้อมูลในเครื่องเสร็จแล้ว + รอนานพอ → เปิดหน้าได้ (แต่ละหน้ามีสถานะ "กำลังโหลด" ของตัวเอง)
  if (booted && waitedEnough && !gatedAlways) return children;
  return <LoadingScreen message="กำลังเชื่อม" />;
}

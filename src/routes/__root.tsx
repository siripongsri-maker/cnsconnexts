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
import { MeetupProvider } from "@/lib/meetup-context";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "../components/ui/sonner";
import { NotificationHost } from "@/components/notification-host";
import { MeetupCardHost } from "@/components/meetup-card-host";
import { CommitmentReminders } from "@/components/commitment-reminders";
import { FilterAlerts } from "@/components/filter-alerts";
import { LoadingScreen } from "@/components/loading-screen";
import { GuidedTour } from "@/components/guided-tour";
import { UsageTracker } from "@/components/usage-tracker";
import { CacheRefresher } from "@/components/cache-refresher";
import { useMotionSettings } from "@/lib/motion";
import { MeadowState, STATE_PRIMARY, STATE_SECONDARY } from "@/components/meadow-state";
import { MotionRuntime } from "@/components/motion-runtime";
import { themeClassFor } from "@/lib/theme";

function NotFoundComponent() {
  return (
    <MeadowState
      title="เส้นทางนี้ยังไม่เชื่อมถึงกัน"
      description="ลิงก์อาจไม่ครบหรือหมดอายุ กลับไปจับคู่กับคนที่น่าเจอได้เลย"
    >
      <Link to="/" className={STATE_PRIMARY}>
        <span>ไปจับคู่</span>
      </Link>
      <Link to="/commitments" className={STATE_SECONDARY}>
        <span>ดูคู่ของฉัน</span>
      </Link>
    </MeadowState>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <MeadowState
      title="สัญญาณสะดุดนิดหน่อย"
      description="หน้านี้ยังโหลดไม่สำเร็จ ลองเชื่อมต่ออีกครั้งได้เลย"
    >
      <span className="sr-only" role="alert">
        หน้านี้โหลดไม่สำเร็จ
      </span>
      <button
        type="button"
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className={STATE_PRIMARY}
      >
        <span>ลองอีกครั้ง</span>
      </button>
      <a href="/" className={STATE_SECONDARY}>
        <span>กลับหน้าแรก</span>
      </a>
    </MeadowState>
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
      { name: "theme-color", content: "#CFEAFB" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&family=Kanit:wght@600;700&family=Prompt:wght@500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap",
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
  // ธีมทุ่งจับคู่ทุกหน้า ยกเว้นหลังบ้าน — เรนเดอร์จากเซิร์ฟเวอร์ ไม่กะพริบ
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <html lang="th" className={themeClassFor(pathname)}>
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
          {/* คำชวนเจอ: ไม่ทำงานเครือข่ายในหน้าหลังบ้าน/หน้าพิมพ์ (ตัดสินใน provider) */}
          <MeetupProvider>
            <HydrationGate>
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <div className="site-experience">
                <Outlet />
              </div>
            </HydrationGate>
            <NotificationHost />
            {/* การ์ดคำชวนเจอ: ไม่เรนเดอร์นอกธีมทุ่ง (ตัดสินในตัวมันเอง) */}
            <MeetupCardHost />
            <CommitmentReminders />
            <FilterAlerts />
            <GuidedTour />
            <UsageTracker />
            <CacheRefresher />
            <LowSpecFlag />
            <MotionRuntime />

            <Toaster position="top-center" />
          </MeetupProvider>
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
  return <LoadingScreen />;
}

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/wordmark";

/**
 * โครงหน้าทางเข้า (สแกน QR / เข้าห้อง / เข้าสู่ระบบ / โปสเตอร์ QR) — ยังไม่มีเมนูล่างเพราะคนยังไม่เข้าแอป
 * แถบหัวสีฟ้าอ่อน: โลโก้ (กลับหน้าแรก) แล้วตามด้วย H1 + คำอธิบาย ตัวอักษร 20px ขึ้นไปทุกจุด
 * wide = เนื้อหากว้างขึ้นบนจอใหญ่ (โปสเตอร์ QR ที่เปิดโชว์หน้างาน)
 */
export function EntryShell({
  title,
  subtitle,
  wide = false,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const column = `mx-auto w-full px-4 ${wide ? "max-w-xl lg:max-w-5xl" : "max-w-xl lg:max-w-3xl"}`;
  return (
    <div className="min-h-dvh pb-10">
      <header className="bg-sky-soft pb-6 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className={column}>
          <Link
            to="/"
            aria-label="คนส. Connexts กลับหน้าแรก"
            className="tap inline-flex min-h-12 min-w-0 items-center rounded-xl"
          >
            <Wordmark size="header" withMark />
          </Link>
          <h1 className="mt-3 font-heading text-display font-bold text-ink [overflow-wrap:anywhere]">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-body text-ink-soft">{subtitle}</p>}
        </div>
      </header>
      <main id="main-content" className={`${column} pt-5`}>
        {children}
      </main>
    </div>
  );
}

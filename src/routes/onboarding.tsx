import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";

import { QuickProfileForm } from "@/components/quick-profile-form";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "สร้างโปรไฟล์พลังของคุณ — คนส. Connexts" },
      {
        name: "description",
        content: "ตอบคำถามสั้น ๆ ไม่ถึง 2 นาที แล้วไปเจอคนที่ใช่ในงานกัน",
      },
      { property: "og:title", content: "สร้างโปรไฟล์พลังของคุณ" },
      { property: "og:description", content: "กรอกครั้งเดียว ใช้ได้ทั้งงาน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { me, hydrated } = useStore();
  const checked = useRef(false);

  // มีโปรไฟล์อยู่แล้วตอนเปิดหน้า → ไม่ต้องกรอกซ้ำ กลับหน้าแรก
  // (เช็คครั้งเดียว: ถ้าบันทึกไม่สำเร็จ store จะมี me แล้ว แต่ต้องคงฟอร์มและข้อความแจ้งไว้)
  useEffect(() => {
    if (!hydrated || checked.current) return;
    checked.current = true;
    if (me) void navigate({ to: "/", replace: true });
  }, [hydrated, me, navigate]);

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pb-10 pt-4">
        <Link
          to="/"
          className="tap inline-flex min-h-12 items-center gap-2 self-start rounded-xl pr-3 text-body font-semibold text-primary underline underline-offset-4"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden />
          กลับหน้าแรก
        </Link>
        <div className="meadow-card flex flex-col gap-5 p-5">
          <div>
            <h1 className="font-heading text-display text-ink">บอกเราสั้น ๆ 3 ข้อ</h1>
            <p className="mt-1 text-body text-ink-soft">ไม่ถึงนาที แล้วไปเจอคนที่ใช่ได้เลย</p>
          </div>
          {hydrated ? (
            <QuickProfileForm onSaved={() => void navigate({ to: "/", replace: true })} />
          ) : (
            <p role="status" className="text-body text-ink-soft">
              กำลังเตรียมหน้า…
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { EntryShell } from "@/components/entry-shell";
import { MeadowScene } from "@/components/meadow-scene";
import { createSession, sourceFromSearch } from "@/lib/session";

const searchSchema = z.object({
  c: fallback(z.string(), "").default(""),
  // โปสเตอร์รุ่นแรกพิมพ์ ?code= ไว้ — ยังรับได้
  code: fallback(z.string(), "").default(""),
  source: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/join")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "เข้าร่วมห้อง — คนส. Connexts" },
      {
        name: "description",
        content:
          "สแกน QR แล้วใช่ไหม? คุณเข้ามาแล้ว! เรากำลังพาคุณเข้างาน แล้วไปสร้างโปรไฟล์พลังกัน",
      },
      { property: "og:title", content: "เข้าร่วม คนส. Connexts" },
      {
        property: "og:description",
        content: "สแกนแล้วเข้าร่วมได้ทันที — สร้างโปรไฟล์พลังของคุณใน 2 นาที",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Join,
});

function Join() {
  const { c, code, source } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    createSession(sourceFromSearch(new URLSearchParams({ source })), c || code || null);
    const t = setTimeout(() => navigate({ to: "/start", replace: true }), 250);
    return () => clearTimeout(t);
  }, [c, code, source, navigate]);

  return (
    <EntryShell
      title={
        <>
          คุณเข้าห้องแล้ว
          <br />
          เริ่มเชื่อมพลังกัน
        </>
      }
      subtitle="ยินดีต้อนรับสู่ คนส. Connexts"
    >
      <div className="meadow-card overflow-hidden text-center">
        <MeadowScene variant="empty" className="pointer-events-none" />
        <div className="flex flex-col items-center gap-3 p-6">
          {(c || code) && (
            <p className="inline-flex items-center gap-2 rounded-full bg-sky-soft px-4 py-1 text-body font-semibold text-ink">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-[#3D7A1C]" aria-hidden />
              รหัสห้อง {c || code}
            </p>
          )}
          <p role="status" className="text-body text-ink-soft">
            กำลังพาคุณไปสร้างโปรไฟล์…
          </p>
          <Link to="/start" className="meadow-btn-primary tap w-full max-w-sm text-center">
            ไปต่อ <ArrowRight className="h-6 w-6" aria-hidden />
          </Link>
        </div>
      </div>
    </EntryShell>
  );
}

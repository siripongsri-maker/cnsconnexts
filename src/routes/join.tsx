import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect } from "react";
import { QrCode, Sparkles } from "lucide-react";
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
    ],
  }),
  component: Join,
});

function Join() {
  const { c, code, source } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    createSession(sourceFromSearch(new URLSearchParams({ source })), c || code || null);
    const t = setTimeout(() => navigate({ to: "/start" }), 600);
    return () => clearTimeout(t);
  }, [c, code, source, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="relative z-10 animate-rise">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl gradient-power text-primary-foreground glow">
          <QrCode className="h-9 w-9" aria-hidden />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold">คุณเข้าห้องแล้ว</h1>
        <p className="mt-2 text-sm font-semibold text-primary">ยินดีต้อนรับสู่ คนส. Connexts</p>
        <p
          role="status"
          className="mt-3 flex items-center justify-center gap-2 text-[13px] text-muted-foreground"
        >
          <Sparkles className="h-4 w-4 animate-pulse-node" aria-hidden />
          กำลังพาคุณเข้างาน…
        </p>
      </div>
    </div>
  );
}

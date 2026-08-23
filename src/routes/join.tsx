import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { QrCode, Sparkles } from "lucide-react";
import { createSession } from "@/lib/session";

const searchSchema = z.object({
  c: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/join")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "เข้าร่วมห้อง — คนส. Connect" },
      {
        name: "description",
        content:
          "สแกน QR แล้วใช่ไหม? คุณเข้ามาแล้ว! เรากำลังตั้งค่าเซสชันของคุณ แล้วพาไปสร้างโปรไฟล์พลัง",
      },
      { property: "og:title", content: "เข้าร่วม คนส. Connect" },
      {
        property: "og:description",
        content: "สแกนแล้วเข้าร่วมได้ทันที — สร้างโปรไฟล์พลังของคุณใน 2 นาที",
      },
    ],
  }),
  component: Join,
});

function Join() {
  const { c } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const session = createSession("qr", c || null);
    setCode(session.id);
    const t = setTimeout(() => navigate({ to: "/onboarding" }), 1100);
    return () => clearTimeout(t);
  }, [c, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-8 text-center">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "var(--gradient-soft)" }}
        aria-hidden
      />
      <div className="relative z-10 animate-rise">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl gradient-power text-primary-foreground glow">
          <QrCode className="h-9 w-9" />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">คุณเข้าห้องแล้ว</h1>
        <p className="mt-2 text-sm font-semibold text-primary">ยินดีต้อนรับสู่ คนส. Connect</p>
        <p className="mt-3 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse-node" />
          กำลังสร้างเซสชันของคุณ…
        </p>
        {code && (
          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            เซสชัน {code}
          </p>
        )}
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MissionVisual } from "@/components/mission-ui";
import { Wordmark } from "@/components/wordmark";
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
    <div className="focused-page join-page min-h-screen">
      <header className="focused-topbar">
        <div className="focused-topbar-inner">
          <Link to="/" aria-label="หน้าแรก">
            <Wordmark size="sm" />
          </Link>
          <span className="focused-system-label">CONNECTION ESTABLISHED</span>
        </div>
      </header>
      <main className="join-welcome">
        <div className="join-signal-visual">
          <MissionVisual variant="signal" />
        </div>
        <div className="join-welcome-copy">
          <span className="mission-kicker">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> CONNECTION / READY
          </span>
          <h1>
            คุณเข้าห้องแล้ว<span>เริ่มเชื่อมพลังกัน</span>
          </h1>
          <p>ยินดีต้อนรับสู่ คนส. Connexts</p>
          {(c || code) && <span className="join-room-code">ROOM / {c || code}</span>}
          <div className="join-progress" aria-hidden>
            <span />
          </div>
          <p role="status" className="join-status">
            กำลังพาคุณไปสร้างโปรไฟล์…
          </p>
          <Link to="/start" className="tap join-continue">
            ไปต่อ <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </main>
    </div>
  );
}

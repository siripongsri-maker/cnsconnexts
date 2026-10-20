import { Wordmark } from "@/components/wordmark";
import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { makeJoinCode } from "@/lib/session";
import { ArrowLeft, ArrowUpRight, Camera, QrCode } from "lucide-react";
import { MissionHeader } from "@/components/mission-ui";

export const Route = createFileRoute("/qr")({
  head: () => ({
    meta: [
      { title: "สแกนเพื่อเข้าร่วม — คนส. Connexts" },
      {
        name: "description",
        content:
          "แสดง QR โค้ดนี้ที่หน้างาน ผู้เข้าร่วมสแกนแล้วเข้าสู่ขั้นตอนสร้างโปรไฟล์บนมือถือได้ทันที",
      },
      { property: "og:title", content: "สแกนเพื่อเข้าร่วม คนส. Connexts" },
      { property: "og:description", content: "สแกนเพื่อเข้าร่วม แล้วสร้างโปรไฟล์พลังของคุณ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QrPoster,
});

function QrPoster() {
  const joinCode = makeJoinCode();
  // source=qr ให้ระบบนับได้ว่าคนเข้ามาจากการสแกนโปสเตอร์
  const [url, setUrl] = useState(`/join?c=${joinCode}&source=qr`);

  useEffect(() => {
    setUrl(`${window.location.origin}/join?c=${joinCode}&source=qr`);
  }, [joinCode]);

  return (
    <div className="focused-page qr-page min-h-screen">
      <header className="focused-topbar">
        <div className="focused-topbar-inner">
          <Link to="/" className="focused-back-link tap" aria-label="กลับหน้าแรก">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <Wordmark size="sm" />
          </Link>
          <span className="focused-system-label">EVENT ACCESS / {joinCode}</span>
        </div>
      </header>
      <main className="focused-content">
        <div className="qr-poster-layout">
          <section className="qr-poster-copy">
            <MissionHeader
              kicker="SCAN TO CONNECT"
              title={
                <>
                  หนึ่งการสแกน
                  <br />
                  หลายความเป็นไปได้
                </>
              }
              description="เปิดกล้องมือถือ สแกน QR แล้วเริ่มสร้างโปรไฟล์ของคุณ"
              variant="signal"
            />
            <ol className="qr-instructions">
              <li>
                <span>01</span> สแกน QR ด้วยกล้องมือถือ
              </li>
              <li>
                <span>02</span> บอกตัวตนและพลังของคุณ
              </li>
              <li>
                <span>03</span> พบคนที่พร้อมไปต่อด้วยกัน
              </li>
            </ol>
            <p className="qr-poster-footnote">
              <Camera className="h-4 w-4" aria-hidden /> ใช้เวลาประมาณ 2 นาที · ไม่ต้องล็อกอิน
            </p>
          </section>
          <section className="qr-poster-card" aria-label="QR สำหรับเข้าร่วมงาน">
            <div className="qr-poster-card-heading">
              <QrCode className="h-5 w-5" aria-hidden />
              <span>SCAN TO JOIN</span>
              <span>↗</span>
            </div>
            <div className="qr-code-paper">
              <QRCodeSVG
                value={url}
                size={280}
                level="M"
                bgColor="#ffffff"
                fgColor="#030508"
                marginSize={2}
              />
            </div>
            <div className="qr-room-label">
              <span>รหัสห้อง / ROOM</span>
              <strong>{joinCode}</strong>
            </div>
            <div className="qr-link-alternative">
              <span>หรือเปิดลิงก์</span>
              <a href={url}>{url}</a>
            </div>
            <Link
              to="/join"
              search={{ c: joinCode, source: "link" }}
              className="tap focused-primary-action"
            >
              <span>เข้าร่วมด้วยเครื่องนี้</span>
              <ArrowUpRight className="h-5 w-5" aria-hidden />
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}

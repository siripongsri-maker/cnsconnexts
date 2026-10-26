import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { makeJoinCode } from "@/lib/session";
import { ArrowUpRight, Camera, QrCode } from "lucide-react";
import { EntryShell } from "@/components/entry-shell";

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

/** ขั้นตอน 3 ข้อ — เลขบนบล็อกสี ใช้คู่สีป้ายแท็กของธีม (ตัวอักษรขาว/พื้นเข้ม) */
const STEPS = [
  { t: "สแกน QR ด้วยกล้องมือถือ", bg: "#6A2C91" },
  { t: "บอกตัวตนและพลังของคุณ", bg: "#0F6DB0" },
  { t: "พบคนที่พร้อมไปต่อด้วยกัน", bg: "#3D7A1C" },
];

function QrPoster() {
  const joinCode = makeJoinCode();
  // source=qr ให้ระบบนับได้ว่าคนเข้ามาจากการสแกนโปสเตอร์
  const [url, setUrl] = useState(`/join?c=${joinCode}&source=qr`);

  useEffect(() => {
    setUrl(`${window.location.origin}/join?c=${joinCode}&source=qr`);
  }, [joinCode]);

  return (
    <EntryShell
      wide
      title={
        <>
          หนึ่งการสแกน
          <br />
          หลายความเป็นไปได้
        </>
      }
      subtitle="เปิดกล้องมือถือ สแกน QR แล้วเริ่มสร้างโปรไฟล์ของคุณ"
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <section aria-label="QR สำหรับเข้าร่วมงาน" className="meadow-card p-5 lg:order-2">
          <h2 className="flex items-center gap-2 font-heading text-lead font-semibold text-ink">
            <QrCode className="h-6 w-6 shrink-0" aria-hidden /> สแกนเพื่อเข้าร่วม
          </h2>
          <div className="mx-auto mt-3 w-fit max-w-full rounded-2xl border border-[#E6E3F2] bg-white p-3">
            <QRCodeSVG
              value={url}
              size={280}
              level="M"
              bgColor="#ffffff"
              fgColor="#030508"
              marginSize={2}
              className="h-auto max-w-full"
              style={{ width: 280, height: "auto" }}
            />
          </div>
          <p className="mt-3 text-center text-body text-ink-soft">
            รหัสห้อง <strong className="font-heading text-lead text-ink">{joinCode}</strong>
          </p>
          <p className="mt-2 text-body text-ink-soft">
            หรือเปิดลิงก์{" "}
            <a href={url} className="break-all font-semibold text-primary underline">
              {url}
            </a>
          </p>
          <Link
            to="/join"
            search={{ c: joinCode, source: "link" }}
            className="meadow-btn-primary tap mt-4 w-full text-center"
          >
            เข้าร่วมด้วยเครื่องนี้
            <ArrowUpRight className="h-6 w-6" aria-hidden />
          </Link>
        </section>

        <section aria-label="ขั้นตอนเข้าร่วม" className="flex flex-col gap-3 lg:order-1">
          <ol className="flex flex-col gap-3">
            {STEPS.map((step, index) => (
              <li key={step.t} className="meadow-card flex items-center gap-3 p-4">
                <span
                  aria-hidden
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-heading text-title font-bold text-white"
                  style={{ backgroundColor: step.bg }}
                >
                  {index + 1}
                </span>
                <span className="text-lead font-semibold text-ink">{step.t}</span>
              </li>
            ))}
          </ol>
          <p className="flex items-center gap-2 text-body text-ink-soft">
            <Camera className="h-6 w-6 shrink-0" aria-hidden /> ใช้เวลาประมาณ 2 นาที ·
            ไม่ต้องล็อกอิน
          </p>
        </section>
      </div>
    </EntryShell>
  );
}

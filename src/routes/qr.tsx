import { Wordmark } from "@/components/wordmark";
import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { makeJoinCode } from "@/lib/session";

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
    ],
  }),
  component: QrPoster,
});

function QrPoster() {
  const joinCode = makeJoinCode();
  const [url, setUrl] = useState(`/join?c=${joinCode}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/join?c=${joinCode}`);
  }, [joinCode]);

  return (
    <div className="relative min-h-screen bg-background px-6 py-[max(2rem,env(safe-area-inset-top))]">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "var(--gradient-soft)" }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="rounded-full border border-border bg-card/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary backdrop-blur">
          สแกนเพื่อเข้าร่วม · Scan to join
        </span>
        <h1 className="mt-5 flex justify-center">
          <Wordmark size="md" withMark />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ยกกล้องมือถือส่องตรงนี้ แล้วคุณจะเข้าสู่หน้าสร้างโปรไฟล์พลังของคุณทันที
        </p>

        <div className="card-soft mt-8 rounded-3xl bg-card p-6">
          <QRCodeSVG value={url} size={232} level="M" bgColor="transparent" fgColor="#3b0f78" />
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          หรือเปิดลิงก์ <span className="font-bold text-foreground">{url}</span>
        </p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          รหัสห้อง {joinCode}
        </p>

        <Link
          to="/join"
          search={{ c: joinCode }}
          className="tap mt-8 flex h-14 w-full max-w-xs items-center justify-center rounded-3xl gradient-power text-sm font-extrabold text-primary-foreground"
        >
          เข้าร่วมด้วยเครื่องนี้
        </Link>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { makeJoinCode } from "@/lib/session";

export const Route = createFileRoute("/qr")({
  head: () => ({
    meta: [
      { title: "Scan to Join — Connecting Power" },
      {
        name: "description",
        content:
          "Display this QR code at the venue. Participants scan it and land straight in onboarding on their phone.",
      },
      { property: "og:title", content: "Scan to Join Connecting Power" },
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
          Scan to join · สแกนเพื่อเข้าร่วม
        </span>
        <h1 className="mt-5 text-[clamp(2rem,9vw,3rem)] font-extrabold leading-tight tracking-tighter">
          <span className="text-gradient">CONNECTING POWER</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Point your phone camera here — you'll go straight into your power profile.
        </p>

        <div className="card-soft mt-8 rounded-3xl bg-card p-6">
          <QRCodeSVG value={url} size={232} level="M" bgColor="transparent" fgColor="#3b0f78" />
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          or open <span className="font-bold text-foreground">{url}</span>
        </p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Room code {joinCode}
        </p>

        <Link
          to="/join"
          search={{ c: joinCode }}
          className="tap mt-8 flex h-14 w-full max-w-xs items-center justify-center rounded-3xl gradient-power text-sm font-extrabold text-primary-foreground"
        >
          Join on this device
        </Link>
      </div>
    </div>
  );
}

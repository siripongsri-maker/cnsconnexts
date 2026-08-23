import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, QrCode, ScanLine, Sparkles, Zap } from "lucide-react";

import { createSession, makeJoinCode } from "@/lib/session";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "สแกน QR เข้าร่วมงาน — คนส. Connect" },
      {
        name: "description",
        content:
          "เปิดกล้องสแกน QR ที่หน้างานเพื่อเข้าร่วม คนส. Connect ได้ทันที หรือเข้าแบบไม่ต้องล็อกอินด้วยปุ่มเดียว",
      },
      { property: "og:title", content: "สแกน QR เข้าร่วมงานทันที" },
      {
        property: "og:description",
        content: "สแกน QR หรือเข้าร่วมแบบไม่ต้องล็อกอิน แล้วสร้างโปรไฟล์พลังของคุณใน 2 นาที",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

type CamState = "idle" | "starting" | "live" | "denied" | "unsupported";

function extractCode(raw: string) {
  try {
    const url = new URL(raw, window.location.origin);
    return url.searchParams.get("c") ?? makeJoinCode();
  } catch {
    return raw.trim().slice(0, 24) || makeJoinCode();
  }
}

function ScanPage() {
  const navigate = useNavigate();
  const { enterGuest } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const [cam, setCam] = useState<CamState>("idle");
  const [manual, setManual] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const join = useCallback(
    (code: string, source: "qr" | "direct") => {
      if (doneRef.current) return;
      doneRef.current = true;
      stop();
      enterGuest();
      createSession(source, code);
      navigate({ to: "/onboarding" });
    },
    [enterGuest, navigate, stop],
  );

  useEffect(() => () => stop(), [stop]);

  const startCamera = useCallback(async () => {
    const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCam("unsupported");
      return;
    }
    setCam("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCam("live");

      const detector = new Detector({ formats: ["qr_code"] });
      const tick = async () => {
        if (doneRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            join(extractCode(codes[0].rawValue), "qr");
            return;
          }
        } catch {
          /* keep scanning */
        }
        rafRef.current = requestAnimationFrame(() => void tick());
      };
      rafRef.current = requestAnimationFrame(() => void tick());
    } catch {
      setCam("denied");
    }
  }, [join]);

  return (
    <div className="relative min-h-screen bg-background px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "var(--gradient-soft)" }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex max-w-xl flex-col">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary backdrop-blur">
          <ScanLine className="h-3.5 w-3.5" />
          สแกนเพื่อเข้าร่วม
        </span>
        <h1 className="mt-4 text-[clamp(1.9rem,8vw,2.6rem)] font-extrabold leading-tight tracking-tighter">
          <span className="text-gradient">สแกน QR เข้าร่วมงาน</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ยกกล้องส่อง QR ที่ติดในห้อง เข้าร่วมได้ทันที ไม่ต้องสมัครสมาชิก
        </p>

        <div className="card-soft mt-6 overflow-hidden rounded-3xl bg-card p-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${cam === "live" ? "" : "opacity-0"}`}
            />
            {cam !== "live" && (
              <div className="absolute inset-0 grid place-items-center px-6 text-center">
                {cam === "denied" || cam === "unsupported" ? (
                  <div>
                    <CameraOff className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-[13px] text-muted-foreground">
                      {cam === "denied"
                        ? "ไม่ได้รับสิทธิ์ใช้กล้อง — ใช้การกรอกรหัสห้องด้านล่างแทนได้"
                        : "เบราว์เซอร์นี้ยังสแกนในหน้าเว็บไม่ได้ — ใช้แอปกล้องของเครื่องส่อง QR หรือกรอกรหัสห้องด้านล่าง"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <QrCode className="mx-auto h-8 w-8 text-primary animate-pulse-node" />
                    <p className="mt-3 text-[13px] text-muted-foreground">
                      {cam === "starting" ? "กำลังเปิดกล้อง…" : "กดเปิดกล้องเพื่อเริ่มสแกน"}
                    </p>
                  </div>
                )}
              </div>
            )}
            {cam === "live" && (
              <div
                className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-lime/80"
                aria-hidden
              />
            )}
          </div>

          {cam !== "live" && (
            <button
              type="button"
              onClick={() => void startCamera()}
              className="tap mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-sm font-bold"
            >
              <Camera className="h-4 w-4" />
              เปิดกล้องสแกน
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => join(makeJoinCode(), "direct")}
          className="tap glow mt-5 flex h-16 items-center justify-between rounded-3xl gradient-power px-6 text-primary-foreground"
        >
          <span className="text-left">
            <span className="block text-base font-extrabold">เข้าร่วมทันที ไม่ต้องล็อกอิน</span>
            <span className="block text-[12px] opacity-90">Join now · no login required</span>
          </span>
          <Zap className="h-5 w-5 shrink-0" />
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          ข้อมูลจะเก็บไว้ในเครื่องนี้ก่อน · ผูกกับอีเมลภายหลังได้ที่หน้าเข้าสู่ระบบ
        </p>

        <div className="card-soft mt-6 rounded-3xl bg-card p-4">
          <label htmlFor="room" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            หรือกรอกรหัสห้อง
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="room"
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="เช่น NHA26"
              className="h-12 flex-1 rounded-2xl border border-border bg-background px-4 text-sm font-bold tracking-widest outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => {
                if (!manual.trim()) {
                  setHint("กรุณากรอกรหัสห้องที่แสดงในงาน");
                  return;
                }
                join(manual.trim(), "direct");
              }}
              className="tap h-12 rounded-2xl bg-ink px-5 text-sm font-extrabold text-background"
            >
              เข้าร่วม
            </button>
          </div>
          {hint && <p className="mt-2 text-[12px] font-semibold text-coral">{hint}</p>}
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-[12px] font-bold text-muted-foreground">
          <Link to="/qr" className="tap inline-flex items-center gap-1.5">
            <QrCode className="h-4 w-4" /> แสดง QR สำหรับติดในห้อง
          </Link>
          <Link to="/auth" className="tap inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}

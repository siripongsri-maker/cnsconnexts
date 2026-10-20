import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Clock, QrCode, ScanLine, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

const GUIDE: { t: string; d: string }[] = [
  { t: "ส่อง QR หรือกรอกรหัสห้อง", d: "QR ติดอยู่ที่บอร์ดและป้ายในพื้นที่ คนส. Connexts" },
  { t: "เข้าร่วมแบบไม่ต้องล็อกอิน", d: "ไม่ต้องสมัคร โปรไฟล์ผูกกับเครื่องนี้ไว้ก่อน ผูกอีเมลภายหลังได้" },
  { t: "สร้าง Power Profile", d: "กรอกครั้งเดียวจบ แล้วระบบจับคู่คนที่ควรเจอให้ทันที" },
];

import { createSession, makeJoinCode, sourceFromSearch } from "@/lib/session";
import { useAuth } from "@/lib/auth";
import type { UserSource } from "@/lib/types";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "สแกน QR เข้าร่วมงาน — คนส. Connexts" },
      {
        name: "description",
        content:
          "เปิดกล้องสแกน QR ที่หน้างานเพื่อเข้าร่วม คนส. Connexts ได้ทันที หรือเข้าแบบไม่ต้องล็อกอินด้วยปุ่มเดียว",
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

  const defaultSource: UserSource = sourceFromSearch(new URLSearchParams(window.location.search));

  const join = useCallback(
    (code: string, source: UserSource) => {
      if (doneRef.current) return;
      doneRef.current = true;
      stop();
      enterGuest();
      createSession(source, code);
      toast.success("เข้าห้องแล้ว! ไปสร้าง Power Profile กันเลย");
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
    <div className="relative min-h-screen px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="relative z-10 mx-auto flex max-w-xl flex-col">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-bold text-primary backdrop-blur">
          <ScanLine className="h-3.5 w-3.5" aria-hidden />
          สแกนเพื่อเข้าร่วม
        </span>
        <h1 className="mt-4 text-[clamp(1.9rem,8vw,2.6rem)] font-extrabold leading-tight">
          <span className="text-foreground">สแกน QR เข้าร่วมงาน</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ยกกล้องส่อง QR ที่ติดในห้อง เข้าร่วมได้ทันที ไม่ต้องสมัครสมาชิก
        </p>

        {/* คำแนะนำก่อนเริ่ม */}
        <ol className="card-soft mt-5 space-y-3 rounded-3xl bg-card p-5">
          <li className="text-xs font-bold text-muted-foreground">
            3 ขั้นตอนก่อนเริ่ม
          </li>
          {GUIDE.map((g, i) => (
            <li key={g.t} className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/12 text-[12px] font-extrabold text-primary">
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-bold">{g.t}</span>
                <span className="block text-[12px] leading-relaxed text-muted-foreground">{g.d}</span>
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-[12px] font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            ใช้เวลารวมประมาณ 2 นาที · เตรียมชื่อ จังหวัด และสิ่งที่คุณให้ได้/ต้องการ
          </li>
        </ol>


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
              <Camera className="h-4 w-4" aria-hidden />
              เปิดกล้องสแกน
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => join(makeJoinCode(), "direct")}
          className="tap mt-5 flex h-16 items-center justify-between rounded-3xl cta-holo px-6 text-primary-foreground"
        >
          <span className="text-left">
            <span className="block text-base font-extrabold">เข้าร่วมทันที ไม่ต้องล็อกอิน</span>
            <span lang="en" className="block text-[12px] opacity-90">
              Join now · no login required
            </span>
          </span>
          <Zap className="h-5 w-5 shrink-0" aria-hidden />
        </button>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          ไม่ต้องสมัคร · โปรไฟล์ผูกกับเครื่องนี้ไว้ก่อน ผูกอีเมลภายหลังเพื่อใช้ในเครื่องอื่นได้ ·{" "}
          <span lang="en">No sign-up needed. Link an email later to use it on other devices</span>
        </p>

        <div className="card-soft mt-6 rounded-3xl bg-card p-4">
          <label htmlFor="room" className="text-xs font-bold text-muted-foreground">
            หรือกรอกรหัสห้อง
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="room"
              value={manual}
              aria-invalid={!!hint}
              aria-describedby={hint ? "room-hint" : undefined}
              onChange={(e) => {
                setManual(e.target.value.toUpperCase());
                setHint(null);
              }}
              placeholder="เช่น NHA26"
              className="h-12 flex-1 rounded-2xl border border-border bg-background px-4 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => {
                if (!manual.trim()) {
                  setHint("ใส่รหัสห้องที่เห็นบนป้ายในงานก่อนนะ · Enter the room code from the event sign");
                  return;
                }
                join(manual.trim(), "direct");
              }}
              className="tap h-12 rounded-2xl bg-ink px-5 text-sm font-extrabold text-background"
            >
              เข้าร่วม
            </button>
          </div>
          {hint && (
            <p id="room-hint" role="alert" className="mt-2 text-[12px] font-semibold text-coral-ink">
              {hint}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-[12px] font-bold text-muted-foreground">
          <Link to="/qr" className="tap inline-flex min-h-11 items-center gap-1.5">
            <QrCode className="h-4 w-4" aria-hidden /> แสดง QR สำหรับติดในห้อง
          </Link>
          <Link to="/auth" className="tap inline-flex min-h-11 items-center gap-1.5">
            <Sparkles className="h-4 w-4" aria-hidden /> เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}

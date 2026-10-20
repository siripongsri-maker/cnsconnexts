import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Camera,
  CameraOff,
  Clock,
  QrCode,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const GUIDE: { t: string; d: string }[] = [
  { t: "สแกนหรือกรอกรหัส", d: "ดู QR และรหัสห้องบนป้ายในงาน" },
  { t: "บอกตัวตนและพลัง", d: "เลือกประเด็น สิ่งที่มีให้ และกำลังมองหา" },
  { t: "พบคนที่ควรเจอ", d: "เลือกเชื่อมต่อ แล้วนัดร่วมทำ" },
];

import { createSession, makeJoinCode } from "@/lib/session";
import { useAuth } from "@/lib/auth";
import type { UserSource } from "@/lib/types";
import { MissionHeader, MissionVisual } from "@/components/mission-ui";
import { Wordmark } from "@/components/wordmark";

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
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (o: { formats: string[] }) => {
          detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;
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
      if (!video) {
        stop();
        return;
      }
      video.srcObject = stream;
      await video.play();
      setCam("live");

      const detector = new Detector({ formats: ["qr_code"] });
      const tick = async () => {
        if (doneRef.current || !videoRef.current || streamRef.current !== stream) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (doneRef.current || streamRef.current !== stream) return;
          if (codes[0]?.rawValue) {
            join(extractCode(codes[0].rawValue), "qr");
            return;
          }
        } catch {
          /* keep scanning */
        }
        if (streamRef.current === stream) {
          rafRef.current = requestAnimationFrame(() => void tick());
        }
      };
      rafRef.current = requestAnimationFrame(() => void tick());
    } catch {
      stop();
      setCam("denied");
    }
  }, [join, stop]);

  return (
    <div className="focused-page scan-page min-h-screen">
      <header className="focused-topbar">
        <div className="focused-topbar-inner">
          <Link to="/" aria-label="กลับหน้าแรก" className="focused-back-link tap">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <Wordmark size="sm" />
          </Link>
          <span className="focused-system-label">NETWORK ACCESS / 01</span>
        </div>
      </header>
      <main className="focused-content">
        <MissionHeader
          kicker="SCAN. CONNECT. CREATE."
          title={
            <>
              สแกนหนึ่งครั้ง
              <br />
              เริ่มเชื่อมพลัง
            </>
          }
          description="สแกน QR ที่หน้างาน หรือเข้าร่วมได้ทันทีโดยไม่ต้องสมัคร"
          number="01"
          variant="signal"
        />
        <div className="scan-layout">
          <section className="mission-panel scan-camera-panel" aria-label="กล้องสแกน QR">
            <div className="scan-console-label">
              <span>
                <ScanLine className="h-4 w-4" aria-hidden /> CAMERA / INPUT 01
              </span>
              <span
                role="status"
                aria-live="polite"
                className={`scan-camera-status ${cam === "live" ? "is-live" : ""}`}
              >
                <span aria-hidden />
                {cam === "live"
                  ? "กำลังสแกน"
                  : cam === "starting"
                    ? "กำลังเปิด"
                    : cam === "denied" || cam === "unsupported"
                      ? "กรอกรหัสได้"
                      : "พร้อมเริ่ม"}
              </span>
            </div>
            <div className="scan-viewfinder">
              <video
                ref={videoRef}
                playsInline
                muted
                aria-label="ภาพจากกล้องสำหรับสแกน QR"
                className={`h-full w-full object-cover ${cam === "live" ? "" : "opacity-0"}`}
              />
              <div className="scan-corners" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </div>
              {cam !== "live" && (
                <div className="scan-camera-placeholder">
                  <MissionVisual variant="signal" className="scan-idle-art" />
                  {cam === "denied" || cam === "unsupported" ? (
                    <div className="scan-camera-message">
                      <CameraOff className="h-8 w-8" aria-hidden />
                      <h2>
                        {cam === "denied" ? "ยังใช้กล้องไม่ได้" : "สแกนผ่านกล้องมือถือได้เลย"}
                      </h2>
                      <p>
                        {cam === "denied"
                          ? "อนุญาตให้ใช้กล้อง หรือลองกรอกรหัสห้อง"
                          : "เบราว์เซอร์นี้ไม่รองรับการสแกน ใช้แอปกล้องส่อง QR หรือกรอกรหัสห้อง"}
                      </p>
                    </div>
                  ) : (
                    <div className="scan-camera-message">
                      <QrCode className="h-9 w-9" aria-hidden />
                      <h2>{cam === "starting" ? "กำลังเปิดกล้อง…" : "วาง QR ไว้ในกรอบ"}</h2>
                      <p>
                        {cam === "starting"
                          ? "อนุญาตให้เบราว์เซอร์ใช้กล้องของคุณ"
                          : "กดเปิดกล้อง แล้วส่อง QR ที่หน้างาน"}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {cam === "live" && <span className="scan-live-hint">วาง QR ให้อยู่กลางกรอบ</span>}
            </div>
            <div className="scan-camera-controls">
              <span>
                <Clock className="h-4 w-4" aria-hidden /> สร้างโปรไฟล์ใน 2 นาที
              </span>
              {cam === "live" ? (
                <button
                  type="button"
                  onClick={() => {
                    stop();
                    setCam("idle");
                  }}
                  className="tap"
                >
                  <CameraOff className="h-4 w-4" aria-hidden /> ปิดกล้อง
                </button>
              ) : (
                <button
                  type="button"
                  disabled={cam === "starting"}
                  aria-busy={cam === "starting"}
                  onClick={() => void startCamera()}
                  className="tap"
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  {cam === "starting" ? "กำลังเปิด…" : "เปิดกล้องสแกน"}
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </section>

          <aside className="scan-entry-options">
            <section className="scan-direct-panel mission-panel">
              <span className="mission-kicker">QUICK ACCESS</span>
              <h2>
                ไม่มี QR
                <br />
                <span>ก็เริ่มได้</span>
              </h2>
              <p>เข้าแบบผู้เยี่ยมชม แล้วสร้างโปรไฟล์ของคุณได้ทันที</p>
              <button
                type="button"
                onClick={() => join(makeJoinCode(), "direct")}
                className="tap focused-primary-action"
              >
                <span>เข้าร่วมทันที</span>
                <ArrowRight className="h-5 w-5" aria-hidden />
              </button>
              <span className="scan-entry-note">ข้อมูลอยู่ในเครื่องนี้ · ผูกบัญชีภายหลังได้</span>
            </section>
            <section className="scan-manual-panel mission-panel">
              <label htmlFor="room" className="mission-kicker">
                ROOM CODE / รหัสห้อง
              </label>
              <div className="scan-room-input">
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
                  className="outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!manual.trim()) {
                      setHint("ใส่รหัสห้องจากป้ายในงานก่อนนะ");
                      return;
                    }
                    join(manual.trim(), "direct");
                  }}
                  aria-label="เข้าร่วมด้วยรหัสห้อง"
                  className="tap"
                >
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
              {hint && (
                <p
                  id="room-hint"
                  role="alert"
                  className="mt-2 text-[12px] font-semibold text-coral-ink"
                >
                  {hint}
                </p>
              )}
            </section>
          </aside>
        </div>

        <ol className="scan-process-strip">
          {GUIDE.map((item, index) => (
            <li key={item.t}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{item.t}</h2>
                <p>{item.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="scan-footer-links">
          <Link to="/qr" className="tap">
            <QrCode className="h-4 w-4" aria-hidden /> แสดง QR สำหรับหน้างาน{" "}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link to="/auth" className="tap">
            <Sparkles className="h-4 w-4" aria-hidden /> เข้าสู่ระบบ{" "}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </main>
    </div>
  );
}

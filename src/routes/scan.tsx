import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, CameraOff, Clock, LogIn, QrCode } from "lucide-react";
import { toast } from "sonner";

/** ขั้นตอน 3 ข้อ — เลขบนบล็อกสี ใช้คู่สีป้ายแท็กของธีม (ตัวอักษรขาว/พื้นเข้ม) */
const GUIDE: { t: string; d: string; bg: string }[] = [
  { t: "สแกนหรือกรอกรหัส", d: "ดู QR และรหัสห้องบนป้ายในงาน", bg: "#6A2C91" },
  { t: "บอกตัวตนและพลัง", d: "เลือกประเด็น สิ่งที่มีให้ และกำลังมองหา", bg: "#0F6DB0" },
  { t: "พบคนที่ควรเจอ", d: "เลือกเชื่อมต่อ แล้วนัดร่วมทำ", bg: "#3D7A1C" },
];

import { createSession, makeJoinCode } from "@/lib/session";
import { useAuth } from "@/lib/auth";
import type { UserSource } from "@/lib/types";
import { EntryShell } from "@/components/entry-shell";

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

  const camLabel =
    cam === "live"
      ? "กำลังสแกน"
      : cam === "starting"
        ? "กำลังเปิดกล้อง"
        : cam === "denied" || cam === "unsupported"
          ? "กรอกรหัสห้องได้เลย"
          : "พร้อมเริ่ม";

  return (
    <EntryShell
      title={
        <>
          สแกนหนึ่งครั้ง
          <br />
          เริ่มเชื่อมพลัง
        </>
      }
      subtitle="สแกน QR ที่หน้างาน หรือเข้าร่วมได้ทันทีโดยไม่ต้องสมัคร"
    >
      <div className="flex flex-col gap-4">
        <section aria-label="กล้องสแกน QR" className="meadow-card p-4">
          <p role="status" aria-live="polite" className="text-body font-semibold text-ink">
            กล้อง: <span className="text-primary">{camLabel}</span>
          </p>
          <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-dashed border-[#8F8BB8] bg-sky-soft">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="ภาพจากกล้องสำหรับสแกน QR"
              className={`h-full w-full object-cover ${cam === "live" ? "" : "opacity-0"}`}
            />
            {cam !== "live" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                {cam === "denied" || cam === "unsupported" ? (
                  <>
                    <CameraOff className="h-10 w-10 text-ink" aria-hidden />
                    <h2 className="font-heading text-lead font-semibold text-ink">
                      {cam === "denied" ? "ยังใช้กล้องไม่ได้" : "สแกนผ่านกล้องมือถือได้เลย"}
                    </h2>
                    <p className="text-body text-ink-soft">
                      {cam === "denied"
                        ? "อนุญาตให้ใช้กล้อง หรือลองกรอกรหัสห้อง"
                        : "เบราว์เซอร์นี้ไม่รองรับการสแกน ใช้แอปกล้องส่อง QR หรือกรอกรหัสห้อง"}
                    </p>
                  </>
                ) : (
                  <>
                    <QrCode className="h-10 w-10 text-ink" aria-hidden />
                    <h2 className="font-heading text-lead font-semibold text-ink">
                      {cam === "starting" ? "กำลังเปิดกล้อง…" : "วาง QR ไว้ในกรอบ"}
                    </h2>
                    <p className="text-body text-ink-soft">
                      {cam === "starting"
                        ? "อนุญาตให้เบราว์เซอร์ใช้กล้องของคุณ"
                        : "กดเปิดกล้อง แล้วส่อง QR ที่หน้างาน"}
                    </p>
                  </>
                )}
              </div>
            )}
            {cam === "live" && (
              <span className="absolute inset-x-3 bottom-3 rounded-xl bg-white px-3 py-1 text-center text-body font-semibold text-ink">
                วาง QR ให้อยู่กลางกรอบ
              </span>
            )}
          </div>
          <p className="mt-3 flex items-center gap-2 text-body text-ink-soft">
            <Clock className="h-6 w-6 shrink-0" aria-hidden /> สร้างโปรไฟล์ใน 2 นาที
          </p>
          {cam === "live" ? (
            <button
              type="button"
              onClick={() => {
                stop();
                setCam("idle");
              }}
              className="meadow-btn-secondary tap mt-3 w-full"
            >
              <CameraOff className="h-6 w-6" aria-hidden /> ปิดกล้อง
            </button>
          ) : (
            <button
              type="button"
              disabled={cam === "starting"}
              aria-busy={cam === "starting"}
              onClick={() => void startCamera()}
              className="meadow-btn-primary tap mt-3 w-full"
            >
              <Camera className="h-6 w-6" aria-hidden />
              {cam === "starting" ? "กำลังเปิด…" : "เปิดกล้องสแกน"}
            </button>
          )}
        </section>

        <section aria-labelledby="manual-h" className="meadow-card p-5">
          <h2 id="manual-h" className="font-heading text-lead font-semibold text-ink">
            มีรหัสห้องใช่ไหม
          </h2>
          <label htmlFor="room" className="mt-2 block text-body text-ink-soft">
            รหัสห้องบนป้ายในงาน
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="room"
              value={manual}
              aria-invalid={!!hint}
              aria-describedby={hint ? "room-hint" : undefined}
              autoCapitalize="characters"
              onChange={(e) => {
                setManual(e.target.value.toUpperCase());
                setHint(null);
              }}
              placeholder="เช่น NHA26"
              className="min-w-0 flex-1 rounded-2xl border-2 bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft/70"
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
              className="meadow-btn-primary tap min-h-14 shrink-0 px-4"
            >
              เข้าห้อง
            </button>
          </div>
          {hint && (
            <p id="room-hint" role="alert" className="mt-2 text-body font-semibold text-[#B3261E]">
              {hint}
            </p>
          )}
        </section>

        <section aria-labelledby="direct-h" className="meadow-card p-5">
          <h2 id="direct-h" className="font-heading text-lead font-semibold text-ink">
            ไม่มี QR ก็เริ่มได้
          </h2>
          <p className="mt-1 text-body text-ink-soft">
            เข้าแบบผู้เยี่ยมชม แล้วสร้างโปรไฟล์ของคุณได้ทันที
          </p>
          <button
            type="button"
            onClick={() => join(makeJoinCode(), "direct")}
            className="meadow-btn-primary tap mt-3 w-full"
          >
            เข้าร่วมทันที
            <ArrowRight className="h-6 w-6" aria-hidden />
          </button>
          <p className="mt-2 text-body text-ink-soft">
            ข้อมูลอยู่ในเครื่องนี้ · ผูกบัญชีภายหลังได้
          </p>
        </section>

        <ol aria-label="ขั้นตอนเข้าร่วม" className="flex flex-col gap-3">
          {GUIDE.map((item, index) => (
            <li key={item.t} className="meadow-card flex items-start gap-3 p-4">
              <span
                aria-hidden
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-heading text-title font-bold text-white"
                style={{ backgroundColor: item.bg }}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h2 className="font-heading text-lead font-semibold text-ink">{item.t}</h2>
                <p className="text-body text-ink-soft">{item.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3">
          <Link to="/qr" className="meadow-btn-secondary tap w-full">
            <QrCode className="h-6 w-6" aria-hidden /> แสดง QR สำหรับหน้างาน
          </Link>
          <Link to="/auth" className="meadow-btn-secondary tap w-full">
            <LogIn className="h-6 w-6" aria-hidden /> เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </EntryShell>
  );
}

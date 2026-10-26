import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Link2 } from "lucide-react";
import { EntryShell } from "@/components/entry-shell";

import {
  createSession,
  getSession,
  sourceFromSearch,
  type ParticipantSession,
} from "@/lib/session";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { INTRO_KEY } from "@/components/intro-guide";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "เริ่มสร้าง Power Profile — คนส. Connexts" },
      {
        name: "description",
        content:
          "เข้าห้องสำเร็จแล้ว เริ่มสร้าง Power Profile ได้ทันทีโดยไม่ต้องล็อกอิน แล้วผูกบัญชีอีเมลทีหลังเมื่อพร้อม",
      },
      { property: "og:title", content: "เริ่มสร้าง Power Profile" },
      {
        property: "og:description",
        content: "ไม่ต้องล็อกอิน ใช้เวลา 2 นาที แล้วเจอคนที่ควรเชื่อมต่อทันที",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StartPage,
});

/** ขั้นตอน 3 ข้อ — เลขบนบล็อกสี ใช้คู่สีป้ายแท็กของธีม (ตัวอักษรขาว/พื้นเข้ม) */
const STEPS = [
  { t: "บอกตัวตน", d: "ชื่อและพื้นที่ของคุณ", bg: "#6A2C91" },
  { t: "เลือกประเด็น", d: "เรื่องที่คุณใส่ใจ", bg: "#0F6DB0" },
  { t: "แบ่งปันพลัง", d: "สิ่งที่มีให้และกำลังมองหา", bg: "#3D7A1C" },
];

function StartPage() {
  const navigate = useNavigate();
  const { enterGuest, mode } = useAuth();
  const { me } = useStore();
  const [session, setSession] = useState<ParticipantSession | null>(null);

  const entrySource = sourceFromSearch(
    new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
  );

  useEffect(() => {
    setSession(getSession() ?? createSession(entrySource, null));
  }, [entrySource]);

  // สแกน QR แล้วเห็นการ์ดคนแรกทันที (สเปก §1/§8): บันทึกช่องทางเข้า (source เช่น "qr") แล้วพาไปหน้าจับคู่เลย
  // ไม่ต้องรอ store โหลด — หน้าแรกจัดการทั้งผู้เยี่ยมชม (แผ่นถาม 3 ข้อ) และคนเดิมเอง
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const begin = () => {
    if (mode !== "user") enterGuest();
    if (!getSession()) createSession(entrySource, null);
    // หน้านี้อธิบาย 3 ขั้นตอนไปแล้ว ไม่ต้องโชว์ IntroGuide ซ้ำ
    if (!me) {
      try {
        localStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    void navigate({ to: "/", replace: true });
  };

  return (
    <EntryShell
      title={
        <>
          พร้อมเชื่อมพลัง
          <br />
          ในแบบของคุณ
        </>
      }
      subtitle="สร้างโปรไฟล์ครั้งเดียว แล้วพบคนที่ควรเจอ"
    >
      <div className="flex flex-col gap-4">
        <section aria-labelledby="start-h" className="meadow-card p-5">
          <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-[#3D7A1C]">
            <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden />
            <span>เข้าห้องสำเร็จ</span>
            {session && (
              <span className="rounded-full bg-sky-soft px-3 text-ink">
                รหัสห้อง {session.code ?? "NHA26"}
              </span>
            )}
          </p>
          <h2 id="start-h" className="mt-2 font-heading text-title font-semibold text-ink">
            2 นาที เพื่อก้าวต่อไป
          </h2>
          <ol className="mt-3 flex flex-col gap-3">
            {STEPS.map((step, index) => (
              <li key={step.t} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-heading text-title font-bold text-white"
                  style={{ backgroundColor: step.bg }}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading text-lead font-semibold text-ink">{step.t}</h3>
                  <p className="text-body text-ink-soft">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" onClick={begin} className="meadow-btn-primary tap mt-5 w-full">
            เริ่มจับคู่
            <ArrowRight className="h-6 w-6" aria-hidden />
          </button>
          <p className="mt-3 text-center text-body text-ink-soft" role="status">
            กำลังพาคุณไปต่อ · ไม่ต้องล็อกอิน
          </p>
        </section>

        <section aria-labelledby="account-h" className="meadow-card p-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky text-ink"
            >
              <Link2 className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <h2 id="account-h" className="font-heading text-lead font-semibold text-ink">
                เริ่มเลย ผูกบัญชีทีหลัง
              </h2>
              <p className="text-body text-ink-soft">
                ผู้เยี่ยมชมเก็บโปรไฟล์ในเครื่องนี้ ผูกอีเมลหรือ Google เพื่อใช้ต่อข้ามอุปกรณ์ได้
              </p>
            </div>
          </div>
          <Link to="/auth" className="meadow-btn-secondary tap mt-4 w-full">
            ผูกบัญชีตอนนี้
          </Link>
        </section>
      </div>
    </EntryShell>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Link2, UserCircle2 } from "lucide-react";
import { MissionHeader, MissionVisual } from "@/components/mission-ui";
import { Wordmark } from "@/components/wordmark";

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

const STEPS = [
  { t: "บอกตัวตน", d: "ชื่อและพื้นที่ของคุณ" },
  { t: "เลือกประเด็น", d: "เรื่องที่คุณใส่ใจ" },
  { t: "แบ่งปันพลัง", d: "สิ่งที่มีให้และกำลังมองหา" },
];

function StartPage() {
  const navigate = useNavigate();
  const { enterGuest, mode } = useAuth();
  const { me, hydrated } = useStore();
  const [session, setSession] = useState<ParticipantSession | null>(null);

  const entrySource = sourceFromSearch(
    new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
  );

  useEffect(() => {
    setSession(getSession() ?? createSession(entrySource, null));
  }, [entrySource]);

  // รวมขั้นตอน: เข้าห้องแล้วพาไปกรอกโปรไฟล์ทันที ไม่ต้องกดอีกหน้า
  const autoRan = useRef(false);
  useEffect(() => {
    if (!hydrated || autoRan.current) return;
    autoRan.current = true;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

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
    void navigate({ to: hydrated && me ? "/update" : "/onboarding", replace: true });
  };

  return (
    <div className="focused-page access-page min-h-screen">
      <header className="focused-topbar">
        <div className="focused-topbar-inner">
          <Link to="/" className="focused-back-link tap" aria-label="กลับหน้าแรก">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <Wordmark size="sm" />
          </Link>
          <span className="focused-system-label">JOIN / CONNEXTS</span>
        </div>
      </header>
      <main className="focused-content">
        <MissionHeader
          kicker="WELCOME TO THE NETWORK"
          title={
            <>
              พร้อมเชื่อมพลัง
              <br />
              ในแบบของคุณ
            </>
          }
          description="สร้างโปรไฟล์ครั้งเดียว แล้วพบคนที่ควรเจอ"
          number="01"
          variant="network"
        />
        <div className="access-layout">
          <section className="mission-panel access-steps-panel">
            <div className="access-ready-label">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              <span>เข้าห้องสำเร็จ</span>
              {session && <span className="access-room">{session.code ?? "NHA26"}</span>}
            </div>
            <h2>2 นาที เพื่อก้าวต่อไป</h2>
            <ol className="access-steps">
              {STEPS.map((step, index) => (
                <li key={step.t}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{step.t}</h3>
                    <p>{step.d}</p>
                  </div>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </li>
              ))}
            </ol>
            <button type="button" onClick={begin} className="tap focused-primary-action">
              <span>{hydrated && me ? "แก้ไขโปรไฟล์ของฉัน" : "เริ่มสร้างโปรไฟล์"}</span>
              <ArrowRight className="h-5 w-5" aria-hidden />
            </button>
            <p className="access-action-note" role="status">
              กำลังพาคุณไปต่อ · ไม่ต้องล็อกอิน
            </p>
          </section>
          <aside className="access-network-panel">
            <MissionVisual variant="network" />
            <div className="access-account-note">
              <Link2 className="h-5 w-5" aria-hidden />
              <div>
                <h2>เริ่มเลย ผูกบัญชีทีหลัง</h2>
                <p>
                  ผู้เยี่ยมชมเก็บโปรไฟล์ในเครื่องนี้ ผูกอีเมลหรือ Google เพื่อใช้ต่อข้ามอุปกรณ์ได้
                </p>
                <Link to="/auth" className="tap">
                  <UserCircle2 className="h-4 w-4" aria-hidden /> ผูกบัญชีตอนนี้{" "}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

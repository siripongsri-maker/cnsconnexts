import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { MissionHeader, MissionVisual } from "@/components/mission-ui";
import { Wordmark } from "@/components/wordmark";
import { toast } from "sonner";

import { ProfileForm } from "@/components/profile-form";
import { useStore } from "@/lib/store";
import { getSession } from "@/lib/session";
import { IntroGuide, hasSeenIntro } from "@/components/intro-guide";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "สร้างโปรไฟล์พลังของคุณ — คนส. Connexts" },
      {
        name: "description",
        content: "ตอบคำถามสั้น ๆ ไม่ถึง 2 นาที แล้วไปเจอคนที่ใช่ในงานกัน",
      },
      { property: "og:title", content: "สร้างโปรไฟล์พลังของคุณ" },
      { property: "og:description", content: "กรอกครั้งเดียว ใช้ได้ทั้งงาน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { me, hydrated, saveProfile } = useStore();
  const [showIntro, setShowIntro] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setShowIntro(!hasSeenIntro());
  }, []);

  // มีโปรไฟล์แล้ว → ไม่ต้องกรอกซ้ำ ไปหน้าคู่เชื่อมเลย
  useEffect(() => {
    if (!hydrated || !me) return;
    void navigate({ to: "/matches", replace: true });
  }, [hydrated, me, navigate]);

  return (
    <div className="editorial-focused focused-page onboarding-page min-h-screen">
      <header className="focused-topbar">
        <div className="focused-topbar-inner">
          <Link to="/" aria-label="กลับหน้าแรก" className="focused-back-link tap">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <Wordmark size="sm" />
          </Link>
          <span className="focused-system-label">PROFILE / CONNEXTS</span>
        </div>
      </header>

      <main className="focused-content">
        <MissionHeader
          kicker="POWER PROFILE"
          title={
            <>
              ให้คนที่ใช่
              <br />
              รู้จักพลังของคุณ
            </>
          }
          description="ชื่อ ประเด็น และสิ่งที่แบ่งปัน — เริ่มเชื่อมต่อใน 2 นาที"
          number="01"
          variant="profile"
        />
        <div className="onboarding-layout">
          <aside className="onboarding-sidebar">
            <div className="onboarding-visual mission-panel">
              <span className="mission-kicker">YOUR NEXT CONNECTION</span>
              <MissionVisual variant="profile" className="onboarding-profile-visual" />
              <h2>
                เริ่มที่ตัวคุณ
                <br />
                <span>ไปต่อด้วยกัน</span>
              </h2>
            </div>
            <nav aria-label="ส่วนต่าง ๆ ของโปรไฟล์" className="profile-section-nav">
              {[
                ["pf-step-1", "ตัวตน"],
                ["pf-step-2", "พื้นที่"],
                ["pf-step-3", "ประเด็นที่ใส่ใจ"],
                ["pf-step-4", "พลังที่แบ่งปัน"],
                ["pf-step-5", "พลังที่มองหา"],
                ["pf-step-6", "แนะนำตัว"],
              ].map(([id, label], index) => (
                <a key={id} href={`#${id}`} className="tap">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {label}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              ))}
            </nav>
            <p className="profile-privacy-note">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
              ใช้นามแฝงและแชร์เฉพาะที่สบายใจ ผู้ร่วมงานเห็นโปรไฟล์เพื่อจับคู่
            </p>
          </aside>

          <div className="onboarding-form-column">
            {hydrated && !me && showIntro && <IntroGuide onDone={() => setShowIntro(false)} />}
            {hydrated && !me && (
              <div className="onboarding-session-note">
                <span className="focused-status-dot" aria-hidden />
                <p>
                  เริ่มได้ทันที{" "}
                  <Link to="/auth">
                    ผูกบัญชีภายหลัง <ArrowUpRight className="inline h-3.5 w-3.5" aria-hidden />
                  </Link>
                </p>
              </div>
            )}
            {hydrated ? (
              <ProfileForm
                initial={me}
                submitLabel={me ? "บันทึกและดูคู่พลัง" : "ค้นหาคู่พลัง"}
                onSubmit={async (draft) => {
                  const session = getSession();
                  try {
                    setSyncing(true);
                    await saveProfile({ ...draft, source: session?.source });
                    void navigate({ to: "/matches" });
                  } catch (err) {
                    console.error("[connexts] บันทึกโปรไฟล์ไม่สำเร็จ", err);
                    toast.error("บันทึกขึ้นระบบไม่สำเร็จ ลองใหม่อีกครั้งนะ");
                  } finally {
                    setSyncing(false);
                  }
                }}
              />
            ) : (
              <div className="mission-panel focused-loading" role="status">
                กำลังเตรียมโปรไฟล์…
              </div>
            )}
            {syncing && (
              <p role="status" className="mt-3 text-center text-[12px] font-bold text-primary">
                กำลังเชื่อมข้อมูลขึ้นระบบ…
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

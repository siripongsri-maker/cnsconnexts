import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

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
        content: "กรอกข้อมูลครั้งเดียวจบในหน้าเดียว แล้วใช้ต่อได้ทั้งการจับคู่ แผนที่ และการส่งผลงาน",
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

  useEffect(() => {
    setShowIntro(!hasSeenIntro());
  }, []);

  // มีโปรไฟล์แล้ว → ไม่ต้องกรอกซ้ำ ไปหน้าคู่เชื่อมเลย
  useEffect(() => {
    if (!hydrated || !me) return;
    void navigate({ to: "/matches", replace: true });
  }, [hydrated, me, navigate]);


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link to="/" className="tap grid h-9 w-9 place-items-center rounded-full bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold leading-tight">
              {me ? "แก้ไขโปรไฟล์ของฉัน" : "สร้างโปรไฟล์พลังของคุณ"}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              กรอกครั้งเดียวจบ ใช้ได้ทั้งการจับคู่ แผนที่ และส่งผลงาน
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 pt-4">
        {hydrated && !me && showIntro && <IntroGuide onDone={() => setShowIntro(false)} />}
        {hydrated && !me && (
          <p className="mb-4 rounded-2xl border border-border bg-card/80 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
            กำลังใช้งานแบบไม่ต้องล็อกอิน — ข้อมูลเก็บในเครื่องนี้ก่อน{" "}
            <Link to="/auth" className="font-bold text-primary">
              ผูกบัญชีทีหลัง
            </Link>{" "}
            ได้เมื่อพร้อม
          </p>
        )}
        {hydrated && (
          <ProfileForm
            initial={me}
            submitLabel={me ? "บันทึกและดูคู่พลัง" : "ค้นหาคู่พลังของฉัน"}
            onSubmit={(draft) => {
              const session = getSession();
              saveProfile({ ...draft, source: session?.source });
              void navigate({ to: "/matches" });
            }}
          />
        )}
      </main>
    </div>
  );
}

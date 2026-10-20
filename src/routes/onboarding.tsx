import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
    <div className="editorial-focused min-h-screen">
      <header className="sticky top-0 z-20 bg-background/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="กลับหน้าแรก"
            className="tap relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted after:absolute after:-inset-1 after:content-['']"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold leading-tight">
              {me ? "แก้ไขโปรไฟล์" : "สร้างโปรไฟล์พลัง"}
            </h1>
            <p className="text-[12px] text-muted-foreground">ไม่ถึง 2 นาที แล้วไปเจอคนที่ใช่</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 pt-4">
        {hydrated && !me && showIntro && <IntroGuide onDone={() => setShowIntro(false)} />}
        {hydrated && !me && (
          <p className="mb-4 rounded-2xl border border-border bg-card/80 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
            ผู้ร่วมงานเห็นโปรไฟล์นี้เพื่อจับคู่ ใช้นามแฝงและแชร์เฉพาะที่สบายใจได้{" "}
            <Link to="/auth" className="font-bold text-primary">
              ผูกบัญชี
            </Link>{" "}
            ภายหลังได้
          </p>
        )}
        {hydrated && (
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
        )}
        {syncing && (
          <p className="mt-3 text-center text-[12px] font-bold text-primary">
            กำลังเชื่อมข้อมูลขึ้นระบบ…
          </p>
        )}
      </main>
    </div>
  );
}

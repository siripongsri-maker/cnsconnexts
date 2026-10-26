import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Bell, BookOpen, Check, LogOut, PlayCircle, Radio } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { TOUR_EVENT } from "@/components/guided-tour";
import { Avatar, IssueBlock } from "@/components/power-bits";
import { ProfileForm } from "@/components/profile-form";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/update")({
  head: () => ({
    meta: [
      { title: "ฉัน — คนส. Connexts" },
      {
        name: "description",
        content:
          "สแกน QR แล้วแก้ไขข้อมูลผู้เข้าร่วมของตัวเองได้ในหน้าเดียว พร้อมดูสถานะการอัปเดตล่าสุด",
      },
      { property: "og:title", content: "อัปเดตข้อมูลผู้เข้าร่วม" },
      {
        property: "og:description",
        content: "แก้ไขข้อมูลของคุณเองได้ง่าย พร้อมแสดงเวลาอัปเดตล่าสุด",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UpdateMe,
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" });
}

/** ปุ่มออกจากระบบ — ย้ายมาไว้ท้ายหน้าโปรไฟล์ แทนการกินที่ในส่วนหัวทุกหน้า */
function SignOutButton() {
  const { mode, signOut } = useAuth();
  if (mode !== "user" && mode !== "guest") return null;
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm("ออกจากระบบตอนนี้ใช่ไหม?")) void signOut();
      }}
      className="tap mx-auto mt-6 flex min-h-12 items-center gap-2 px-4 text-body font-semibold text-ink-soft underline-offset-4 hover:underline"
    >
      <LogOut className="h-5 w-5" aria-hidden />
      ออกจากระบบ
    </button>
  );
}

const QUICK_LINK_CLASS =
  "tap flex min-h-14 items-center gap-3 rounded-[18px] border border-[#E6E3F2] bg-white px-4 text-body font-semibold text-ink shadow-[0_8px_24px_-12px_rgba(43,40,120,0.25)]";

/** ทางลัดไปหน้าที่อยู่ในแท็บ "ฉัน" + ปุ่มเปิดทัวร์แนะนำ (ทางเข้าเดียวของทัวร์) */
function QuickLinks() {
  return (
    <div className="grid gap-3">
      <Link to="/notifications" className={QUICK_LINK_CLASS}>
        <Bell className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        การแจ้งเตือน
      </Link>
      <Link to="/dashboard" className={QUICK_LINK_CLASS}>
        <Radio className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        สดในงาน
      </Link>
      <Link to="/guide" className={QUICK_LINK_CLASS}>
        <BookOpen className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        คู่มือ
      </Link>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}
        className={`${QUICK_LINK_CLASS} text-left`}
      >
        <PlayCircle className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        ดูทัวร์แนะนำ
      </button>
    </div>
  );
}

/** รอรูปโปรไฟล์ที่โหลดเบื้องหลังไม่เกินเวลานี้ ก่อนเปิดฟอร์มให้แก้ */
const PHOTO_WAIT_MS = 3000;

function UpdateMe() {
  const { me, hydrated, photosLoaded, saveProfile } = useStore();
  const [saved, setSaved] = useState(false);
  const [qrUrl, setQrUrl] = useState("/update");
  const [photoWaitOver, setPhotoWaitOver] = useState(false);

  useEffect(() => {
    setQrUrl(`${window.location.origin}/update`);
  }, []);

  useEffect(() => {
    if (!hydrated || photosLoaded) return;
    const t = setTimeout(() => setPhotoWaitOver(true), PHOTO_WAIT_MS);
    return () => clearTimeout(t);
  }, [hydrated, photosLoaded]);

  // เปิดฟอร์มเมื่อรูปเดิมโหลดมาแล้ว เพื่อไม่ให้การบันทึกลบรูปเดิมโดยไม่ตั้งใจ
  const formReady = hydrated && !!me && (photosLoaded || photoWaitOver);

  const lastUpdate = me?.updated_at ?? me?.created_at ?? null;
  const navigate = useNavigate();

  // หน้าเดียวสำหรับโปรไฟล์: ยังไม่มีโปรไฟล์ → ไปกรอกครั้งแรก
  useEffect(() => {
    if (!hydrated || me) return;
    let has = false;
    try {
      has = !!localStorage.getItem("connexts-participant-id");
    } catch {
      has = false;
    }
    if (!has) void navigate({ to: "/onboarding", replace: true });
  }, [hydrated, me, navigate]);

  if (hydrated && !me) {
    return (
      <AppShell title="ฉัน" subtitle="ยังไม่พบโปรไฟล์ในเครื่องนี้">
        <div className="space-y-5">
          <section className="rounded-3xl border border-[#E6E3F2] bg-white p-6 text-center shadow-[0_8px_24px_-12px_rgba(43,40,120,0.25)]">
            <h2 className="font-heading text-title font-bold text-ink">เริ่มต้นจากพลังของคุณ</h2>
            <p className="mt-2 text-body text-ink-soft">
              สร้างโปรไฟล์ครั้งเดียว แล้วกลับมาแก้ไขได้ตลอดงาน
            </p>
            <Link
              to="/onboarding"
              className="tap mt-5 flex min-h-16 items-center justify-center rounded-[18px] bg-primary px-6 text-body font-semibold text-white"
            >
              สร้างโปรไฟล์ของฉัน
            </Link>
          </section>
          <QuickLinks />
          <SignOutButton />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="ฉัน" subtitle="แก้ไขได้ตลอดงาน แล้วกดบันทึก">
      <div className="profile-update-page space-y-5">
        {me && (
          <section className="rounded-3xl border border-[#E6E3F2] bg-white p-5 shadow-[0_8px_24px_-12px_rgba(43,40,120,0.25)]">
            <div className="flex items-center gap-4">
              <Avatar user={me} size={72} />
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-2 font-heading text-title font-bold text-ink [overflow-wrap:anywhere]">
                  {me.name}
                </h2>
                {me.organization && (
                  <p className="line-clamp-2 text-body text-ink-soft [overflow-wrap:anywhere]">
                    {me.organization}
                  </p>
                )}
              </div>
            </div>
            {me.interests.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {me.interests.slice(0, 3).map((issue) => (
                  <IssueBlock key={issue} issue={issue} />
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E6E3F2] pt-4">
              <div className="min-w-0">
                <p className="text-body font-semibold text-ink">
                  {saved
                    ? "บันทึกเรียบร้อย"
                    : lastUpdate
                      ? `อัปเดตล่าสุด ${timeAgo(lastUpdate)}`
                      : "ยังไม่เคยอัปเดต"}
                </p>
                {lastUpdate && (
                  <p className="text-body text-ink-soft">
                    {new Date(lastUpdate).toLocaleString("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
              <span
                aria-hidden
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                  saved ? "bg-primary text-white" : "bg-sky text-ink"
                }`}
              >
                <Check className="h-6 w-6" strokeWidth={2.6} />
              </span>
            </div>
          </section>
        )}

        <QuickLinks />

        {hydrated && me && !formReady && (
          <p
            role="status"
            className="rounded-3xl border border-[#E6E3F2] bg-white p-5 text-center text-body font-semibold text-ink-soft"
          >
            กำลังโหลดรูปโปรไฟล์ของคุณ…
          </p>
        )}

        {formReady && me && (
          <ProfileForm
            key={`${me.updated_at ?? me.created_at}-${photosLoaded ? "photo" : "nophoto"}`}
            initial={me}
            submitLabel="บันทึกข้อมูลของฉัน"
            onSubmit={async (draft) => {
              const session = getSession();
              try {
                await saveProfile({ ...draft, source: session?.source });
                setSaved(true);
                const motionOff =
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                  document.documentElement.hasAttribute("data-lowspec");
                window.scrollTo({ top: 0, behavior: motionOff ? "instant" : "smooth" });
                setTimeout(() => setSaved(false), 4000);
              } catch (err) {
                console.error("[connexts] บันทึกโปรไฟล์ไม่สำเร็จ", err);
                toast.error("บันทึกขึ้นระบบไม่สำเร็จ ลองใหม่อีกครั้งนะ");
              }
            }}
          />
        )}

        <div className="profile-qr-card flex items-center gap-5 rounded-3xl border border-[#E6E3F2] bg-white p-5 shadow-[0_8px_24px_-12px_rgba(43,40,120,0.25)]">
          <div className="shrink-0 bg-white p-3">
            <QRCodeSVG value={qrUrl} size={84} bgColor="#ffffff" fgColor="#2B2878" />
          </div>
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">QR ของฉัน</p>
            <p className="mt-1 text-body text-ink-soft">
              สแกนจากมือถือเครื่องไหนก็เข้ามาแก้ไขข้อมูลนี้ได้ทันที
            </p>
          </div>
        </div>

        <SignOutButton />
      </div>
    </AppShell>
  );
}

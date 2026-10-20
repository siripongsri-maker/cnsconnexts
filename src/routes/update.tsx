import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, LogOut, QrCode } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ProfileForm } from "@/components/profile-form";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/update")({
  head: () => ({
    meta: [
      { title: "อัปเดตข้อมูลของฉัน — คนส. Connexts" },
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
      className="tap mx-auto mt-6 flex min-h-11 items-center gap-2 px-4 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      ออกจากระบบ · <span lang="en">Sign out</span>
    </button>
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

  if (hydrated && !me) {
    return (
      <AppShell title="อัปเดตข้อมูลของฉัน" subtitle="ยังไม่พบโปรไฟล์ในเครื่องนี้">
        <div className="px-5 py-8">
          <div className="card-soft rounded-3xl bg-card p-6 text-center">
            <QrCode className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              คุณยังไม่มีโปรไฟล์ในเครื่องนี้ สร้างโปรไฟล์ครั้งเดียว แล้วกลับมาแก้ไขได้ทุกเมื่อ
            </p>
            <Link
              to="/onboarding"
              className="tap mt-5 inline-flex items-center justify-center rounded-3xl gradient-power px-6 py-3 text-sm font-extrabold text-primary-foreground"
            >
              สร้างโปรไฟล์ของฉัน
            </Link>
          </div>
          <SignOutButton />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="อัปเดตข้อมูลของฉัน" subtitle="แก้ไขได้ตลอดงาน แล้วกดบันทึก">
      <div className="space-y-5 px-5 py-5">
        <div className="card-soft rounded-3xl bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                สถานะข้อมูล
              </p>
              <p className="mt-1 text-sm font-extrabold">
                {saved
                  ? "บันทึกเรียบร้อย ✨"
                  : lastUpdate
                    ? `อัปเดตล่าสุด ${timeAgo(lastUpdate)}`
                    : "ยังไม่เคยอัปเดต"}
              </p>
              {lastUpdate && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(lastUpdate).toLocaleString("th-TH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                saved ? "gradient-power text-primary-foreground" : "bg-accent text-primary"
              }`}
            >
              <Check className="h-5 w-5" strokeWidth={2.6} />
            </span>
          </div>
        </div>

        {hydrated && me && !formReady && (
          <p role="status" className="card-soft rounded-3xl p-5 text-center text-sm font-semibold text-muted-foreground">
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
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => setSaved(false), 4000);
              } catch (err) {
                console.error("[connexts] บันทึกโปรไฟล์ไม่สำเร็จ", err);
                toast.error("บันทึกขึ้นระบบไม่สำเร็จ ลองใหม่อีกครั้งนะ");
              }
            }}
          />
        )}

        <div className="card-soft flex items-center gap-4 rounded-3xl bg-card p-4">
          <div className="rounded-2xl bg-background p-2">
            <QRCodeSVG value={qrUrl} size={84} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold">QR ของฉัน</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              สแกนจากมือถือเครื่องไหนก็เข้ามาแก้ไขข้อมูลนี้ได้ทันที
            </p>
          </div>
        </div>

        <SignOutButton />
      </div>
    </AppShell>
  );
}

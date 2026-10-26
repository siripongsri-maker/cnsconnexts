import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CheckCircle2,
  Compass,
  Hand,
  MapPin,
  MessageCircle,
  QrCode,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BLOCK_TAG } from "@/lib/issue-colors";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "คู่มือใช้งานฉบับเข้าใจง่าย — คนส. Connexts" },
      {
        name: "description",
        content:
          "คู่มือใช้งาน คนส. Connexts ตัวอักษรใหญ่ อ่านง่ายทุกช่วงวัย ตั้งแต่สร้างโปรไฟล์ วิธีปัดซ้ายปัดขวา จนถึงการนัดก้าวต่อไป",
      },
      { property: "og:title", content: "คู่มือใช้งาน คนส. Connexts" },
      {
        property: "og:description",
        content: "3 ขั้นตอนง่าย ๆ สร้างโปรไฟล์ → เลือกคนที่ใช่ → นัดก้าวต่อไป",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuidePage,
});

const STEPS = [
  {
    icon: UserCircle2,
    title: "1. บอกพลังของคุณ",
    body: "ใส่ชื่อ จังหวัด ประเด็นที่สนใจ สิ่งที่มีและต้องการ ใช้ไม่ถึง 2 นาที เริ่มได้โดยไม่ต้องล็อกอิน",
    to: "/onboarding" as const,
    cta: "เริ่มสร้างโปรไฟล์",
    tag: BLOCK_TAG.purple,
  },
  {
    icon: Sparkles,
    title: "2. เลือกคนที่อยากคุย",
    body: "ดูคนที่เหมาะกับคุณพร้อมเหตุผล แล้วกด “ขอเชื่อมต่อ”",
    to: "/matches" as const,
    cta: "ดูคู่เชื่อมของฉัน",
    tag: BLOCK_TAG.blue,
  },
  {
    icon: CheckCircle2,
    title: "3. นัดก้าวต่อไป",
    body: "ตกลงสิ่งที่จะทำและนัดวันไว้ ระบบจะเตือนทั้งสองฝ่ายให้ร่วมทำหลังจบงาน",
    to: "/commitments" as const,
    cta: "ดูก้าวต่อไป",
    tag: BLOCK_TAG.green,
  },
];

const EXPLORE = [
  { icon: MapPin, to: "/map" as const, label: "แผนที่พลัง", hint: "ดูคนและงานในแต่ละจังหวัด" },
  {
    icon: MessageCircle,
    to: "/marketplace" as const,
    label: "ตลาดพลัง",
    hint: "ลงไอเดีย หาเพื่อนร่วมทำ",
  },
  { icon: QrCode, to: "/scan" as const, label: "สแกน QR", hint: "ชวนคนข้าง ๆ เข้าร่วม" },
];

const FAQ = [
  {
    q: "ต้องสมัครสมาชิกไหม",
    a: "สแกน QR แล้วเริ่มได้เลย ผูกอีเมลภายหลังเพื่อใช้ข้อมูลข้ามเครื่อง",
  },
  {
    q: "ข้อมูลของฉันถูกเก็บอย่างไร",
    a: "ใช้ข้อมูลที่คุณกรอกเพื่อจับคู่ในงาน ยินยอมเก็บข้อมูลการใช้งานได้ที่หน้าแรก และขอลบข้อมูลได้ทุกเมื่อ",
  },
];

function GuidePage() {
  return (
    <AppShell title="คู่มือใช้งาน">
      <div className="mx-auto w-full space-y-5 pb-8">
        <section className="meadow-card bg-sky-soft p-5">
          <p className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 py-1 text-body font-semibold text-white">
            <Compass className="h-5 w-5 shrink-0" aria-hidden="true" /> รู้จัก เชื่อมต่อ ร่วมทำ
          </p>
          <p className="mt-3 text-lead font-semibold text-ink">
            คนส. Connexts จับคู่สิ่งที่คุณมี กับสิ่งที่อีกฝ่ายต้องการ
          </p>
          <p className="mt-2 text-body text-ink-soft">เจอคนที่ใช่ แล้วนัดก้าวต่อไปก่อนแยกย้าย</p>
        </section>

        <div className="space-y-4">
          {STEPS.map(({ icon: Icon, title, body, to, cta, tag }) => (
            <section key={title} className="meadow-card p-5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                  style={{ backgroundColor: tag.bg, color: tag.fg }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h2 className="min-w-0 pt-1 font-heading text-title font-semibold! break-words text-ink">
                  {title}
                </h2>
              </div>
              <p className="mt-3 text-body text-ink-soft">{body}</p>
              <Link to={to} className="meadow-btn-secondary mt-4 w-full">
                {cta}
              </Link>
            </section>
          ))}
        </div>

        <section className="meadow-card p-5">
          <h2 className="flex items-center gap-3 font-heading text-title font-semibold! text-ink">
            <Hand className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />{" "}
            วิธีใช้การ์ดคู่เชื่อม
          </h2>
          <div className="mt-4 space-y-3 text-body text-ink">
            <p className="flex items-start gap-3 rounded-2xl bg-sky-soft p-4">
              <ArrowLeftRight className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <b>ปัดขวา</b> = เก็บในรายการถูกใจ · <b>ปัดซ้าย</b> = ข้าม
              </span>
            </p>
            <p className="rounded-2xl bg-sky-soft p-4">
              ใช้ปุ่มใต้การ์ดแทนได้: <b>ข้าม</b> · <b>ขอเชื่อมต่อ</b> · <b>สนใจ</b>
            </p>
            <p className="rounded-2xl bg-sky-soft p-4">
              ดูเป็นรายชื่อได้ที่ปุ่ม <b>รายการ</b> ด้านบน
            </p>
          </div>
        </section>

        <section className="meadow-card p-5">
          <h2 className="font-heading text-title font-semibold! text-ink">คำถามที่พบบ่อย</h2>
          <div className="mt-4 space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="text-body font-bold text-ink">{f.q}</h3>
                <p className="mt-1 text-body text-ink-soft">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="meadow-card p-5">
          <h2 className="font-heading text-title font-semibold! text-ink">สำรวจต่อ</h2>
          <ul className="mt-4 space-y-3">
            {EXPLORE.map(({ icon: Icon, to, label, hint }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="tap flex min-h-14 items-start gap-3 rounded-2xl bg-sky-soft p-4 text-body text-ink"
                >
                  <Icon className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <b className="underline underline-offset-4">{label}</b> — {hint}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Link to="/onboarding" className="meadow-btn-primary w-full">
          เริ่มใช้งานเลย
        </Link>
      </div>
    </AppShell>
  );
}

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
import { Button } from "@/components/ui/button";

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
  },
  {
    icon: Sparkles,
    title: "2. เลือกคนที่อยากคุย",
    body: "ดูคนที่เหมาะกับคุณพร้อมเหตุผล แล้วกด “ขอเชื่อมต่อ”",
    to: "/matches" as const,
    cta: "ดูคู่เชื่อมของฉัน",
  },
  {
    icon: CheckCircle2,
    title: "3. นัดก้าวต่อไป",
    body: "ตกลงสิ่งที่จะทำและนัดวันไว้ ระบบจะเตือนทั้งสองฝ่ายให้ร่วมทำหลังจบงาน",
    to: "/commitments" as const,
    cta: "ดูก้าวต่อไป",
  },
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
    <AppShell title="คู่มือใช้งาน" titleEn="Guide">
      <div className="editorial-guide mx-auto w-full space-y-8 pb-8">
        <section className="border-b border-border py-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-[12px] font-bold text-primary">
            <Compass className="h-3.5 w-3.5" /> รู้จัก เชื่อมต่อ ร่วมทำ
          </p>
          <p className="mt-3 text-[16px] font-semibold leading-relaxed">
            คนส. Connexts จับคู่สิ่งที่คุณมี กับสิ่งที่อีกฝ่ายต้องการ
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            เจอคนที่ใช่ แล้วนัดก้าวต่อไปก่อนแยกย้าย
          </p>
        </section>

        {STEPS.map(({ icon: Icon, title, body, to, cta }) => (
          <section key={title} className="border-b border-border py-8">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/12">
                <Icon className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold leading-snug">{title}</h2>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{body}</p>
                <Button asChild variant="outline" className="mt-5">
                  <Link to={to}>{cta}</Link>
                </Button>
              </div>
            </div>
          </section>
        ))}

        <section className="border-b border-border py-8">
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
            <Hand className="h-5 w-5 text-primary" /> วิธีใช้การ์ดคู่เชื่อม
          </h2>
          <div className="mt-3 space-y-2.5 text-[14.5px] leading-relaxed">
            <p className="flex items-start gap-2 rounded-2xl bg-muted/60 p-3">
              <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <b>ปัดขวา</b> = เก็บในรายการถูกใจ · <b>ปัดซ้าย</b> = ข้าม
              </span>
            </p>
            <p className="rounded-2xl bg-muted/60 p-3">
              ใช้ปุ่มใต้การ์ดแทนได้: <b>ข้าม</b> · <b>ขอเชื่อมต่อ</b> · <b>สนใจ</b>
            </p>
            <p className="rounded-2xl bg-muted/60 p-3">
              ดูเป็นรายชื่อได้ที่ปุ่ม <b>รายการ</b> ด้านบน
            </p>
          </div>
        </section>

        <section className="border-b border-border py-8">
          <h2 className="text-[17px] font-extrabold">คำถามที่พบบ่อย</h2>
          <div className="mt-3 space-y-3">
            {FAQ.map((f) => (
              <div key={f.q}>
                <p className="text-[15px] font-extrabold">{f.q}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-border py-8">
          <h2 className="text-[17px] font-extrabold">สำรวจต่อ</h2>
          <ul className="mt-3 space-y-2 text-[14.5px]">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />{" "}
              <Link to="/map" className="font-bold underline underline-offset-4">
                แผนที่พลัง
              </Link>{" "}
              — ดูคนและงานในแต่ละจังหวัด
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />{" "}
              <Link to="/marketplace" className="font-bold underline underline-offset-4">
                ตลาดพลัง
              </Link>{" "}
              — ลงไอเดีย หาเพื่อนร่วมทำ
            </li>
            <li className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />{" "}
              <Link to="/scan" className="font-bold underline underline-offset-4">
                สแกน QR
              </Link>{" "}
              — ชวนคนข้าง ๆ เข้าร่วม
            </li>
          </ul>
        </section>

        <Button asChild variant="mission" className="h-14">
          <Link to="/onboarding">เริ่มใช้งานเลย</Link>
        </Button>
      </div>
    </AppShell>
  );
}

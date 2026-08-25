import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CheckCircle2,
  Compass,
  Hand,
  Home,
  MapPin,
  MessageCircle,
  QrCode,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import { SponsorFooter } from "@/components/sponsor-footer";

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
    title: "1. สร้างโปรไฟล์พลังของคุณ",
    body: "บอกชื่อ จังหวัด ประเด็นที่สนใจ สิ่งที่คุณมีให้คนอื่นได้ และสิ่งที่คุณกำลังมองหา ใช้เวลาไม่ถึง 2 นาที ไม่ต้องล็อกอินก็เริ่มได้",
    to: "/onboarding" as const,
    cta: "เริ่มสร้างโปรไฟล์",
  },
  {
    icon: Sparkles,
    title: "2. ดูคนที่ระบบแนะนำให้",
    body: "ระบบจะเรียงคนที่เหมาะกับคุณที่สุดไว้ก่อน พร้อมบอกเหตุผลสั้น ๆ ว่าทำไมถึงควรคุยกัน ถ้าสนใจกด “ขอเชื่อมต่อ” ได้เลย",
    to: "/matches" as const,
    cta: "ดูคู่เชื่อมของฉัน",
  },
  {
    icon: CheckCircle2,
    title: "3. นัด “ก้าวต่อไป” ร่วมกัน",
    body: "เมื่อเชื่อมกันแล้ว ให้ตกลงว่าจะทำอะไรต่อและนัดวันไว้ ระบบจะเตือนให้ทั้งสองฝ่าย เพื่อให้ความร่วมมือเกิดขึ้นจริงหลังจบงาน",
    to: "/commitments" as const,
    cta: "ดูก้าวต่อไป",
  },
];

const FAQ = [
  {
    q: "ปัดซ้าย ปัดขวา คืออะไร ต้องทำยังไง",
    a: "ในหน้า “คู่เชื่อม” จะมีการ์ดโปรไฟล์ทีละใบ ลากการ์ดไปทางขวา = สนใจ/เก็บไว้ ลากไปทางซ้าย = ข้ามคนนี้ ถ้าไม่ถนัดลาก ให้กดปุ่มใหญ่ด้านล่างการ์ดแทนได้เลย มีคำว่า ข้าม / ขอเชื่อมต่อ / สนใจ เขียนไว้ชัดเจน",
  },
  {
    q: "ไม่อยากปัดเลย ได้ไหม",
    a: "ได้ครับ กดปุ่ม “รายการ” ที่ด้านบนของหน้าคู่เชื่อม จะเปลี่ยนเป็นรายชื่อแบบเลื่อนขึ้นลงตามปกติ ไม่ต้องปัดซ้ายขวาเลย",
  },
  {
    q: "ต้องสมัครสมาชิกไหม",
    a: "ไม่ต้องก็ได้ สแกน QR แล้วเริ่มใช้งานได้ทันที ถ้าอยากเก็บข้อมูลไว้ใช้ข้ามเครื่อง ค่อยผูกอีเมลภายหลังได้",
  },
  {
    q: "ข้อมูลของฉันถูกเก็บอย่างไร",
    a: "เก็บเฉพาะข้อมูลที่คุณกรอกเพื่อใช้จับคู่ในงานนี้ และมีปุ่มยินยอมการเก็บข้อมูลการใช้งานที่หน้าแรก คุณขอให้ลบข้อมูลได้ตลอดเวลา",
  },
];

function GuidePage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <Link to="/" aria-label="กลับหน้าแรก" className="tap grid h-9 w-9 place-items-center rounded-full bg-muted">
            <Home className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold">คู่มือใช้งาน</h1>
            <p className="text-[12px] text-muted-foreground">อ่าน 1 นาที แล้วใช้งานได้เลย</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl space-y-4 px-5 pb-16 pt-5">
        <section className="card-soft rounded-3xl p-5">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-[12px] font-bold text-primary">
            <Compass className="h-3.5 w-3.5" /> แอปนี้มีไว้ทำอะไร
          </p>
          <p className="mt-3 text-[16px] font-semibold leading-relaxed">
            คนส. Connexts ช่วยให้คุณเจอ “คนที่ควรคุยด้วย” ในงานนี้ได้เร็วขึ้น
            โดยจับคู่จากสิ่งที่คุณมี กับสิ่งที่อีกฝ่ายกำลังต้องการ
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            เป้าหมายไม่ใช่แค่รู้จักกัน แต่คือได้ “ก้าวต่อไป” ที่นัดวันไว้จริง ๆ ก่อนแยกย้าย
          </p>
        </section>

        {STEPS.map(({ icon: Icon, title, body, to, cta }) => (
          <section key={title} className="card-soft rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/12">
                <Icon className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold leading-snug">{title}</h2>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{body}</p>
                <Link
                  to={to}
                  className="tap mt-3 inline-flex h-11 items-center rounded-2xl bg-accent px-4 text-[14px] font-extrabold text-foreground"
                >
                  {cta}
                </Link>
              </div>
            </div>
          </section>
        ))}

        <section className="card-soft rounded-3xl p-5">
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
            <Hand className="h-5 w-5 text-primary" /> วิธีใช้การ์ดคู่เชื่อม
          </h2>
          <div className="mt-3 space-y-2.5 text-[14.5px] leading-relaxed">
            <p className="flex items-start gap-2 rounded-2xl bg-muted/60 p-3">
              <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <b>ลากการ์ดไปขวา</b> = สนใจ เก็บไว้ในรายการถูกใจ · <b>ลากไปซ้าย</b> = ข้ามคนนี้ไปก่อน
              </span>
            </p>
            <p className="rounded-2xl bg-muted/60 p-3">
              ไม่ถนัดลาก? ใต้การ์ดมีปุ่มใหญ่ 3 ปุ่ม <b>ข้าม</b> · <b>ขอเชื่อมต่อ</b> · <b>สนใจ</b> กดได้เลย
            </p>
            <p className="rounded-2xl bg-muted/60 p-3">
              อยากดูเป็นรายชื่อธรรมดา กดปุ่ม <b>รายการ</b> ด้านบนของหน้าคู่เชื่อม
            </p>
          </div>
        </section>

        <section className="card-soft rounded-3xl p-5">
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

        <section className="card-soft rounded-3xl p-5">
          <h2 className="text-[17px] font-extrabold">เมนูอื่นที่น่าลอง</h2>
          <ul className="mt-3 space-y-2 text-[14.5px]">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> <Link to="/map" className="font-bold underline underline-offset-4">แผนที่พลัง</Link> — ดูว่ามีใครทำอะไรอยู่ในจังหวัดไหน
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> <Link to="/marketplace" className="font-bold underline underline-offset-4">ตลาดนัดไอเดีย</Link> — เสนอไอเดียและหาเพื่อนร่วมทำ
            </li>
            <li className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" /> <Link to="/scan" className="font-bold underline underline-offset-4">สแกน QR</Link> — ชวนคนข้าง ๆ เข้าร่วมทันที
            </li>
          </ul>
        </section>

        <Link
          to="/onboarding"
          className="tap flex h-14 items-center justify-center rounded-3xl gradient-power text-base font-extrabold text-primary-foreground"
        >
          เริ่มใช้งานเลย
        </Link>

        <SponsorFooter />
      </main>
    </div>
  );
}

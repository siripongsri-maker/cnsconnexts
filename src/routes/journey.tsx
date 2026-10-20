import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, Home, Layers, Printer } from "lucide-react";

import { DATA_MODEL, SECTIONS, type JourneyStep } from "@/lib/journey-data";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Journey ทุกฟังก์ชัน — คนส. CoNnextS" },
      {
        name: "description",
        content:
          "คู่มือเส้นทางการใช้งานทุกหน้าของแอป คนส. CoNnextS พร้อมภาพหน้าจอ ข้อมูลเข้า-ออก และวิธีที่หน้าบ้านเชื่อมกับหลังบ้าน",
      },
      { property: "og:title", content: "Journey ทุกฟังก์ชัน — คนส. CoNnextS" },
      {
        property: "og:description",
        content: "เอกสารฉบับเดียวสำหรับ สช. ผู้ทดลองใช้ และทีมพัฒนา พร้อมภาพหน้าจอทุกหน้า",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JourneyPage,
});

function StepCard({ step }: { step: JourneyStep }) {
  return (
    <article id={step.id} className="card-soft scroll-mt-20 overflow-hidden rounded-3xl bg-card">
      <div className="grid gap-4 p-4 sm:grid-cols-[220px_1fr] sm:p-5">
        <a href={`/journey/${step.shot}`} target="_blank" rel="noreferrer" className="block">
          <img
            src={`/journey/${step.shot}`}
            alt={`ภาพหน้าจอ ${step.title}`}
            loading="lazy"
            width={420}
            height={900}
            className="w-full rounded-2xl border border-border bg-muted object-cover object-top"
          />
        </a>

        <div className="min-w-0 space-y-3">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-extrabold text-primary">
                {step.no}
              </span>
              <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-bold">{step.path}</code>
            </div>
            <h3 className="mt-1.5 text-[15px] font-extrabold">{step.title}</h3>
            <p className="text-[12.5px] text-muted-foreground">{step.goal}</p>
          </header>

          <div className="grid gap-3 sm:grid-cols-3">
            <Block title="ผู้ใช้ทำอะไรได้" items={step.actions} />
            <Block title="ข้อมูลเข้า" items={step.input} />
            <Block title="ข้อมูลออก" items={step.output} />
          </div>

          <p className="rounded-2xl bg-muted/60 p-3 text-[12px] leading-relaxed">
            <span className="font-extrabold">เชื่อมหลังบ้าน: </span>
            {step.backend}
          </p>
        </div>
      </div>
    </article>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((t) => (
          <li key={t} className="text-[12.5px] leading-snug">
            · {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function JourneyPage() {
  return (
    <div className="editorial-journey min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" aria-label="กลับหน้าแรก" className="tap grid h-9 w-9 place-items-center rounded-xl bg-muted">
            <Home className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold">Journey ทุกฟังก์ชัน</p>
            <p className="truncate text-xs text-muted-foreground">คนส. CoNnextS · เอกสารฉบับเดียวจบ</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="tap ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-bold"
          >
            <Printer className="h-3.5 w-3.5" /> พิมพ์/PDF
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-24 pt-5">
        <section className="card-soft space-y-3 rounded-3xl bg-card p-5">
          <h1 className="text-[20px] font-extrabold">
            คู่มือเส้นทางการใช้งาน <span className="text-gradient">คนส. CoNnextS</span>
          </h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            เอกสารนี้รวบรวมทุกหน้าและทุกฟังก์ชันของแอป พร้อมภาพหน้าจอจริง อธิบายว่าแต่ละหน้ารับข้อมูลอะไรเข้า
            ส่งอะไรออก และเชื่อมกับระบบหลังบ้านอย่างไร ใช้ได้ 3 แบบ:
          </p>
          <ul className="space-y-1 text-[13px]">
            <li>
              <b>1. สช. และผู้สนับสนุน</b> — อ่านหัวข้อ “ภาพรวมแนวคิด” และเส้นทางผู้เข้าร่วม เพื่อเห็นคุณค่าของงาน
            </li>
            <li>
              <b>2. ผู้ทดลองใช้</b> — ทำตามลำดับ 1 → 20 ในเส้นทางผู้เข้าร่วมได้ทันที
            </li>
            <li>
              <b>3. ทีมพัฒนา</b> — ดูชื่อไฟล์/ฟังก์ชันที่เกี่ยวข้องในบรรทัด “เชื่อมหลังบ้าน” และตารางโครงสร้างข้อมูลท้ายเอกสาร
            </li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="tap inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-bold"
              >
                <Layers className="h-3.5 w-3.5" /> {s.title}
              </a>
            ))}
            <a
              href="#data"
              className="tap inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-bold"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" /> โครงสร้างข้อมูล
            </a>
          </div>
        </section>

        <section className="card-soft space-y-2 rounded-3xl bg-card p-5">
          <h2 className="text-[16px] font-extrabold">ภาพรวมแนวคิดและสถาปัตยกรรม</h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            แนวคิดคือเปลี่ยน “การเจอกันในงานสมัชชา” ให้กลายเป็น “ความร่วมมือที่มีเจ้าภาพและวันนัดจริง”
            ระบบจึงไล่ผู้ใช้จากโปรไฟล์พลัง → คู่เชื่อมที่มีเหตุผลรองรับ → คำมั่นสัญญาที่ติดตามได้ → ผลงานที่กลายเป็นคลังความรู้
          </p>
          <pre className="overflow-x-auto rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed">{`หน้าบ้าน (มือถือ)                    แกนข้อมูลกลาง                    หลังบ้าน /admin
/scan → /start → /onboarding  ─┐
/matches /map /marketplace     ├─►  lib/store.ts (React Context)  ◄─┬─ /admin/people /ideas
/connection /chat /calendar    │     ├ localStorage: connecting-power-v1  ├─ /submissions /map
/commitments /submit /ebook   ─┘     ├ lib/live.ts: BroadcastChannel      ├─ /connections /commitments
                                     └ lib/matching.ts: คะแนนแมตช์        └─ /live /qr /import /export
บัญชี: /auth ─► Lovable Cloud (อีเมล/Google) ─► ผูกโปรไฟล์ guest เดิม`}</pre>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            สถานะปัจจุบันเป็นโปรโตไทป์ที่เก็บข้อมูลไว้ในเครื่องผู้ใช้ (localStorage) เพื่อให้ทดลองใช้หน้างานได้โดยไม่ต้องรอระบบกลาง
            ส่วนบัญชีผู้ใช้เชื่อมกับระบบคลาวด์แล้ว เฟสถัดไปคือย้ายข้อมูลกิจกรรมทั้งหมดขึ้นฐานข้อมูลกลางเพื่อซิงก์ข้ามอุปกรณ์
          </p>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20 space-y-3">
            <header className="px-1">
              <h2 className="text-[17px] font-extrabold">{section.title}</h2>
              <p className="text-[12.5px] text-muted-foreground">{section.subtitle}</p>
            </header>
            <div className="space-y-3">
              {section.steps.map((step) => (
                <StepCard key={step.id} step={step} />
              ))}
            </div>
          </section>
        ))}

        <section id="data" className="card-soft scroll-mt-20 space-y-3 rounded-3xl bg-card p-5">
          <h2 className="text-[16px] font-extrabold">โครงสร้างข้อมูล (บันทึกผู้พัฒนา)</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">ชนิดข้อมูล</th>
                  <th className="py-2 pr-3">ฟิลด์</th>
                  <th className="py-2">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {DATA_MODEL.map((row) => (
                  <tr key={row.name} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 font-extrabold">{row.name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.fields}</td>
                    <td className="py-2">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-1 text-[12.5px]">
            <li>· คีย์ที่ใช้ในเครื่อง: <code>connecting-power-v1</code> (ข้อมูลทั้งหมด), <code>connecting-power-session</code> (เซสชันผู้เข้าร่วม), <code>connext-admin-session</code> (ประตูหลังบ้าน)</li>
            <li>· สูตรจับคู่: need↔have 40% · ประเด็นร่วม 30% · ทักษะ 20% · ภูมิภาค 10% (แก้ที่ <code>src/lib/matching.ts</code>)</li>
            <li>· เหตุการณ์สด: <code>emitLive()</code> ใน <code>src/lib/live.ts</code> ส่งผ่าน BroadcastChannel ให้ /dashboard และ /admin/live</li>
            <li>· ไฟล์เอกสารฉบับข้อความอยู่ที่ <code>docs/JOURNEY.md</code> · ภาพหน้าจอทั้งหมดที่ <code>public/journey/</code></li>
          </ul>
        </section>
      </main>
    </div>
  );
}

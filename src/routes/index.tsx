import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpaceNav } from "@/components/space-nav";
import missionSatellite from "@/assets/mission-satellite.jpg";
import { useStore } from "@/lib/store";
import { getPublicStats } from "@/lib/stats.functions";
import heroOrbit from "@/assets/hero-orbit-3d.jpg";
import { PdpaConsent } from "@/components/pdpa-consent";
import { SponsorFooter } from "@/components/sponsor-footer";
import { BottomNav } from "@/components/bottom-nav";
import { useScrollReveal } from "@/lib/use-scroll-reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "คนส. Connexts — เชื่อมคน เชื่อมไอเดีย เชื่อมพลัง" },
      {
        name: "description",
        content:
          "ทุกคนมีพลังของตัวเอง มาค้นหาว่าวันนี้คุณควรเชื่อมกับใคร ในงานสมัชชาสุขภาพแห่งชาติ",
      },
      { property: "og:title", content: "คนส. Connexts" },
      {
        property: "og:description",
        content: "เชื่อมคน เชื่อมไอเดีย เชื่อมพื้นที่ สู่การลงมือทำ",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    try {
      const stats = await getPublicStats();
      return { stats };
    } catch {
      return { stats: { participants: 0, ideas: 0, connections: 0 } };
    }
  },
  component: Welcome,
});



function Welcome() {
  const revealRef = useScrollReveal();
  const { stats } = Route.useLoaderData();
  const { users, ideas, connections } = useStore();
  const tiles = [
    { n: Math.max(stats.participants, users.length), th: "คน", en: "People" },
    { n: Math.max(stats.ideas, ideas.length), th: "ไอเดีย", en: "Ideas" },
    { n: Math.max(stats.connections, connections.length), th: "การเชื่อม", en: "Connections" },
    { n: new Set(users.map((u) => u.region).filter((r) => r && r !== "Nationwide")).size, th: "ภาค", en: "Regions" },
  ];
  return (
    <div ref={revealRef} className="mission-home">
      <PdpaConsent />
      <SpaceNav />
      <BottomNav />
      <section className="mission-hero">
        <div data-reveal="image" className="mission-hero-media">
          <img src={missionSatellite} alt="ดาวเทียมเหนือโลกและเครือข่ายประเทศไทย" width={1920} height={1088} fetchPriority="high" className="mission-hero-image" />
        </div>
        <div className="mission-hero-scrim" aria-hidden />
        <div className="mission-hero-copy">
          <p data-reveal lang="en" className="mission-eyebrow">Find your people. Act together.</p>
          <h1 data-reveal data-reveal-order="1" lang="en" className="mission-wordmark">CONNECTING<br />POWER</h1>
          <p data-reveal data-reveal-order="2" className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">เชื่อมคน เชื่อมไอเดีย เชื่อมพื้นที่<br />สู่การลงมือทำด้วยกัน</p>
        </div>
        <div className="mission-hero-bottom">
          <a href="#challenge" className="mission-scroll" aria-label="เลื่อนดูเรื่องราว"><ArrowDown className="h-5 w-5" aria-hidden /><span lang="en">Scroll to explore</span></a>
          <Button asChild variant="mission" className="h-14 px-5"><Link to="/onboarding">เริ่มหาคนที่ใช่<ArrowUpRight aria-hidden /></Link></Button>
        </div>
      </section>

      <section id="challenge" className="mission-statement mission-container">
        <div data-reveal><p lang="en" className="mission-eyebrow mission-challenge-label">The Challenge</p><h2 className="mission-statement-title">คนเก่งมาอยู่ในงานเดียวกันเป็นพัน <span className="text-muted-foreground">แต่ไม่รู้จะคุยกับใคร แลกนามบัตรแล้วก็จบแค่นั้น</span></h2></div>
        <div data-reveal><p lang="en" className="mission-eyebrow">The Solution</p><h2 className="mission-statement-title">บอกว่าคุณมีพลังอะไร ต้องการอะไร แล้วเชื่อมกับคนที่เติมกันได้พอดี</h2></div>
      </section>

      <section className="mission-lifecycle mission-container">
        <p data-reveal lang="en" className="mission-eyebrow">Your mission</p>
        <h2 data-reveal className="mission-section-title">พลังของคุณ<br /><span className="text-muted-foreground">เริ่มได้ใน 4 ก้าว</span></h2>
        <div className="mission-steps">
          {STEPS.map((step, i) => <Link data-reveal data-reveal-order={i + 1} to={step.to} key={step.en} className="mission-step group"><span className="mission-step-number">0{i + 1}</span><span lang="en" className="mission-step-en">{step.en}</span><h3 className="text-xl font-medium">{step.th}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.d}</p><ArrowUpRight className="mt-8 h-6 w-6 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden /></Link>)}
        </div>
      </section>

      <section className="mission-map-section">
        <img src={heroOrbit} alt="ประเทศไทยและเครือข่ายแสงจากวงโคจร" loading="lazy" width={1024} height={1280} className="mission-map-image" />
        <div className="mission-map-shade" aria-hidden />
        <div className="mission-container relative">
          <p data-reveal lang="en" className="mission-eyebrow">Connected across Thailand</p>
          <h2 data-reveal className="mission-section-title">เชื่อมพลัง<br />ทั่วประเทศไทย</h2>
          <div data-reveal className="mt-8 flex flex-wrap gap-3"><Button asChild variant="mission" className="h-12"><Link to="/map">สำรวจแผนที่พลัง<ArrowUpRight aria-hidden /></Link></Button><Button asChild variant="outline" className="h-12 rounded-none"><Link to="/marketplace">ตลาดพลัง<ArrowUpRight aria-hidden /></Link></Button></div>
        </div>
      </section>

      <section className="mission-container mission-live" aria-label="สถิติสดในงาน">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-6"><h2 className="mission-section-title">พลังที่เชื่อมกัน</h2><Link to="/dashboard" className="mission-eyebrow flex min-h-11 items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-electric" />Live now<ArrowUpRight className="h-4 w-4" aria-hidden /></Link></div>
        <div className="mission-stats">{tiles.map((tile, i) => <Link data-reveal data-reveal-order={i + 1} key={tile.en} to="/dashboard" className="mission-stat"><span className="mission-stat-number">{tile.n}</span><span className="mt-3 block text-sm text-muted-foreground">{tile.th} · <span lang="en">{tile.en}</span></span></Link>)}</div>
      </section>

      <section className="mission-container mission-launch">
        <p data-reveal lang="en" className="mission-eyebrow">The next step is yours</p>
        <h2 data-reveal className="mission-section-title">เริ่มเชื่อมพลัง<br />ของคุณวันนี้</h2>
        <div data-reveal className="mt-10 flex flex-wrap gap-4"><Button asChild variant="mission" className="h-14 px-7"><Link to="/onboarding">เริ่มเลย<ArrowUpRight aria-hidden /></Link></Button><Button asChild variant="outline" className="h-14 rounded-none px-7"><Link to="/scan"><QrCode aria-hidden />สแกน QR</Link></Button></div>
      </section>
      <footer className="mission-container mission-footer"><SponsorFooter /><div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground"><span lang="en">CONNEXTS · CONNECTING POWER</span><Link to="/guide" className="inline-flex min-h-11 items-center gap-2">คู่มือใช้งาน<ArrowUpRight className="h-4 w-4" aria-hidden /></Link></div></footer>
    </div>
  );
}

const STEPS = [
  { th: "สร้างโปรไฟล์พลัง", en: "Define", d: "บอกสิ่งที่ให้ได้และสิ่งที่ต้องการ", to: "/onboarding" },
  { th: "ปัดหาคนที่ใช่", en: "Discover", d: "ค้นหาคนที่เติมพลังให้กัน พร้อมเหตุผลที่ควรเจอ", to: "/matches" },
  { th: "เชื่อมและนัดคุย", en: "Connect", d: "แชทและนัดหมาย เพื่อเริ่มทำสิ่งดี ๆ ด้วยกัน", to: "/commitments" },
  { th: "ลงมือทำด้วยกัน", en: "Act", d: "แลกเปลี่ยนไอเดียและติดตามผลจากการเชื่อมพลัง", to: "/marketplace" },
] as const;

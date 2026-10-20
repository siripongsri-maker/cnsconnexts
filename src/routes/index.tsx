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
    { n: Math.max(stats.connections, connections.length), th: "การเชื่อมต่อ", en: "Connections" },
    {
      n: new Set(users.map((u) => u.region).filter((r) => r && r !== "Nationwide")).size,
      th: "ภาค",
      en: "Regions",
    },
  ];
  return (
    <div ref={revealRef} className="mission-home">
      <PdpaConsent />
      <SpaceNav />
      <BottomNav />
      <main id="main-content">
        <section className="mission-hero" aria-labelledby="welcome-title">
          <div data-reveal="image" className="mission-hero-media">
            <img
              src={missionSatellite}
              alt="ดาวเทียมเหนือโลกและเครือข่ายประเทศไทย"
              width={1920}
              height={1088}
              fetchPriority="high"
              className="mission-hero-image"
            />
          </div>
          <div className="mission-hero-scrim" aria-hidden />
          <div className="mission-hero-copy">
            <p data-reveal lang="en" className="mission-eyebrow">
              People. Ideas. Action.
            </p>
            <h1
              id="welcome-title"
              data-reveal
              data-reveal-order="1"
              lang="en"
              className="mission-wordmark"
            >
              CONNECTING
              <br />
              POWER<span className="mission-period">.</span>
            </h1>
            <p data-reveal data-reveal-order="2" className="mission-hero-description">
              เชื่อมคน ไอเดีย และพื้นที่
              <br />
              สู่การลงมือทำด้วยกัน
            </p>
          </div>
          <div className="mission-hero-bottom">
            <a href="#challenge" className="mission-scroll" aria-label="เลื่อนดูเรื่องราว">
              <ArrowDown className="h-4 w-4" aria-hidden />
              <span>เลื่อนเพื่อรู้จักเรา</span>
            </a>
            <Link to="/onboarding" className="mission-action">
              หาคนที่ใช่
              <span className="mission-action-icon">
                <ArrowUpRight aria-hidden />
              </span>
            </Link>
          </div>
        </section>

        <section id="challenge" className="mission-statement mission-container">
          <div data-reveal className="mission-statement-row">
            <p lang="en" className="mission-eyebrow mission-challenge-label">
              01 / The challenge
            </p>
            <h2 className="mission-statement-title">
              เจอคนมากมาย
              <br />
              <span className="text-muted-foreground">แต่ยังไม่เจอคนที่ใช่</span>
            </h2>
          </div>
          <div data-reveal className="mission-statement-row">
            <p lang="en" className="mission-eyebrow">
              02 / The connection
            </p>
            <h2 className="mission-statement-title">
              เชื่อมสิ่งที่คุณมี
              <br />
              กับสิ่งที่ใครสักคนต้องการ
            </h2>
          </div>
        </section>

        <section className="mission-lifecycle mission-container">
          <p data-reveal lang="en" className="mission-eyebrow">
            Your next move
          </p>
          <h2 data-reveal className="mission-section-title">
            รู้จัก เชื่อมต่อ
            <br />
            <span className="text-muted-foreground">แล้วไปต่อด้วยกัน</span>
          </h2>
          <div className="mission-steps">
            {STEPS.map((step, i) => (
              <Link
                data-reveal
                data-reveal-order={i + 1}
                to={step.to}
                key={step.en}
                className="mission-step group"
              >
                <div className="mission-step-top">
                  <span className="mission-step-number">0{i + 1}</span>
                  <ArrowUpRight
                    className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                    aria-hidden
                  />
                </div>
                <span lang="en" className="mission-step-en">
                  {step.en}
                </span>
                <h3>{step.th}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.d}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mission-map-section">
          <img
            src={heroOrbit}
            alt="ประเทศไทยและเครือข่ายแสงจากวงโคจร"
            loading="lazy"
            width={1024}
            height={1280}
            className="mission-map-image"
          />
          <div className="mission-map-shade" aria-hidden />
          <div className="mission-container relative">
            <p data-reveal lang="en" className="mission-eyebrow">
              One connected network
            </p>
            <h2 data-reveal className="mission-section-title">
              ต่างพื้นที่
              <br />
              พลังเดียวกัน<span className="mission-period">.</span>
            </h2>
            <div data-reveal className="mt-10 flex flex-wrap gap-3">
              <Button asChild variant="mission" className="h-12">
                <Link to="/map">
                  สำรวจแผนที่
                  <ArrowUpRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-none">
                <Link to="/marketplace">
                  แลกเปลี่ยนไอเดีย
                  <ArrowUpRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mission-container mission-live" aria-label="สถิติสดในงาน">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p lang="en" className="mission-eyebrow">
                Our collective power
              </p>
              <h2 className="mission-section-title">พลังที่เชื่อมกัน</h2>
            </div>
            <Link to="/dashboard" className="mission-live-link">
              <span className="mission-live-dot" />
              ดูสถิติสด
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mission-stats">
            {tiles.map((tile, i) => (
              <Link
                data-reveal
                data-reveal-order={i + 1}
                key={tile.en}
                to="/dashboard"
                className="mission-stat"
              >
                <span className="mission-stat-number">{tile.n.toLocaleString("th-TH")}</span>
                <span className="mission-stat-label">{tile.th}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mission-container mission-launch">
          <div>
            <p data-reveal lang="en" className="mission-eyebrow">
              Ready to connect?
            </p>
            <h2 data-reveal className="mission-section-title">
              ก้าวต่อไป
              <br />
              เริ่มที่คุณ<span className="mission-period">.</span>
            </h2>
          </div>
          <div data-reveal className="mission-launch-actions">
            <Link to="/onboarding" className="mission-action">
              เริ่มเชื่อมพลัง
              <span className="mission-action-icon">
                <ArrowUpRight aria-hidden />
              </span>
            </Link>
            <Link to="/scan" className="mission-scan">
              <QrCode className="h-4 w-4" aria-hidden />
              สแกน QR
            </Link>
          </div>
        </section>
      </main>
      <div className="mission-container mission-footer">
        <SponsorFooter />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <span lang="en">CONNEXTS / CONNECTING POWER</span>
          <Link to="/guide" className="inline-flex min-h-11 items-center gap-2">
            คู่มือใช้งาน
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { th: "บอกพลังของคุณ", en: "Define", d: "สิ่งที่มี · สิ่งที่มองหา", to: "/onboarding" },
  { th: "เจอคนที่ใช่", en: "Discover", d: "คนที่เติมกัน พร้อมเหตุผลที่ควรเจอ", to: "/matches" },
  { th: "เชื่อมและนัดคุย", en: "Connect", d: "แชท นัดหมาย วางก้าวต่อไป", to: "/commitments" },
  { th: "ลงมือด้วยกัน", en: "Act", d: "แลกไอเดีย สร้างงาน ติดตามผล", to: "/marketplace" },
] as const;

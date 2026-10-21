import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpaceNav } from "@/components/space-nav";
import { MissionStory } from "@/components/mission-story";
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
        <MissionStory />

        <section id="explore-network" className="mission-map-section">
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

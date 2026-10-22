import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { ArrowUpRight, QrCode } from "lucide-react";
import { SpaceNav } from "@/components/space-nav";
import { MissionStory } from "@/components/mission-story";
import { useStore } from "@/lib/store";
import { getPublicStats } from "@/lib/stats.functions";
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
  const { users, ideas, connections, hydrated } = useStore();
  const tiles = [
    { n: Math.max(stats.participants, users.length), th: "คน", en: "People" },
    { n: Math.max(stats.ideas, ideas.length), th: "ไอเดีย", en: "Ideas" },
    { n: Math.max(stats.connections, connections.length), th: "การเชื่อมต่อ", en: "Connections" },
    {
      n: hydrated
        ? new Set(users.map((u) => u.region).filter((r) => r && r !== "Nationwide")).size
        : null,
      th: "ภูมิภาค",
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

        <section
          id="collective-power"
          className="collective-power"
          aria-labelledby="collective-title"
        >
          <div className="mission-container collective-inner">
            <div className="collective-heading">
              <div data-reveal className="collective-copy">
                <p lang="en" className="mission-eyebrow collective-eyebrow">
                  <span aria-hidden="true" /> Our collective power
                </p>
                <h2 id="collective-title" className="collective-title">
                  ต่างพลัง
                  <br />
                  <span>
                    เชื่อมเป็นหนึ่ง<span className="mission-period">.</span>
                  </span>
                </h2>
                <p className="collective-description">เชื่อมคน ไอเดีย และพื้นที่ ให้ไปต่อด้วยกัน</p>
                <Link to="/dashboard" className="collective-dashboard">
                  สำรวจพลังของเรา <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </div>
              <div data-reveal="image" className="collective-visual" aria-hidden="true">
                <svg className="collective-orbits" viewBox="0 0 600 600" fill="none">
                  <defs>
                    <radialGradient id="collective-halo">
                      <stop stopColor="#159fff" stopOpacity="0.2" />
                      <stop offset="1" stopColor="#159fff" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient
                      id="collective-line"
                      x1="80"
                      y1="100"
                      x2="500"
                      y2="520"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#23618c" stopOpacity="0.15" />
                      <stop offset="0.5" stopColor="#75cfff" />
                      <stop offset="1" stopColor="#23618c" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  <circle cx="300" cy="300" r="280" fill="url(#collective-halo)" />
                  <g className="collective-grid" stroke="#31516c" strokeWidth="0.7">
                    <circle cx="300" cy="300" r="232" strokeDasharray="2 9" />
                    <path d="M300 42v516M42 300h516" strokeDasharray="2 9" />
                    <circle cx="300" cy="300" r="160" opacity="0.5" />
                  </g>
                  <g
                    className="collective-orbit-lines"
                    stroke="url(#collective-line)"
                    strokeWidth="1.2"
                  >
                    <ellipse
                      cx="300"
                      cy="300"
                      rx="242"
                      ry="105"
                      transform="rotate(-32 300 300)"
                      pathLength="1"
                    />
                    <ellipse
                      cx="300"
                      cy="300"
                      rx="242"
                      ry="105"
                      transform="rotate(32 300 300)"
                      pathLength="1"
                    />
                    <ellipse
                      cx="300"
                      cy="300"
                      rx="105"
                      ry="242"
                      transform="rotate(-16 300 300)"
                      pathLength="1"
                    />
                  </g>
                  <g className="collective-orbit-nodes" fill="#bceaff" stroke="#159fff">
                    <circle cx="109" cy="216" r="5" />
                    <circle cx="456" cy="151" r="5" />
                    <circle cx="393" cy="468" r="5" />
                    <circle cx="302" cy="300" r="8" />
                  </g>
                  <circle cx="302" cy="300" r="24" stroke="#64c5ff" strokeOpacity="0.3" />
                  <g className="collective-crosshairs" stroke="#5d809b">
                    <path d="M60 70h18m-9-9v18M522 530h18m-9-9v18" />
                  </g>
                </svg>
              </div>
            </div>

            <dl className="collective-metrics">
              {tiles.map((tile, i) => (
                <div
                  data-reveal
                  data-reveal-order={i + 1}
                  key={tile.en}
                  className="collective-metric"
                >
                  <dt>
                    <span className="collective-metric-index" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")} / {tile.en}
                    </span>
                    <span className="collective-metric-label">{tile.th}</span>
                  </dt>
                  <dd
                    className="collective-metric-value"
                    aria-busy={tile.n === null || undefined}
                    style={
                      {
                        "--metric-characters": Math.max(
                          2,
                          (tile.n?.toLocaleString("th-TH") ?? "—").length,
                        ),
                      } as CSSProperties
                    }
                  >
                    {tile.n === null ? (
                      <span aria-label="กำลังโหลด">—</span>
                    ) : (
                      tile.n.toLocaleString("th-TH")
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="collective-next">
              <div data-reveal>
                <p lang="en" className="mission-eyebrow">
                  Your next move
                </p>
                <h2 className="collective-next-title">
                  พลังต่อไป เริ่มที่คุณ<span className="mission-period">.</span>
                </h2>
              </div>
              <div data-reveal className="collective-actions">
                <Link to="/onboarding" className="collective-start">
                  เริ่มเชื่อมพลัง
                  <span>
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </Link>
                <Link to="/scan" className="collective-scan">
                  <QrCode size={16} aria-hidden="true" /> สแกน QR
                </Link>
              </div>
            </div>
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

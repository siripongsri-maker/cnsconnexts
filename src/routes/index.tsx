import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SpaceNav } from "@/components/space-nav";
import { MissionStory } from "@/components/mission-story";
import { PeopleNetwork } from "@/components/people-network";
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
  const { users, ideas, connections, me, hydrated, networkAvailable } = useStore();
  const totals = {
    people: Math.max(stats.participants, users.length),
    ideas: Math.max(stats.ideas, ideas.length),
    connections: Math.max(
      stats.connections,
      connections.filter((connection) => !connection.pending).length,
    ),
  };
  return (
    <div ref={revealRef} className="mission-home">
      <PdpaConsent />
      <SpaceNav />
      <BottomNav />
      <main id="main-content">
        <MissionStory />

        <PeopleNetwork
          users={users}
          connections={connections}
          me={me}
          hydrated={hydrated}
          available={networkAvailable}
          totals={totals}
        />
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

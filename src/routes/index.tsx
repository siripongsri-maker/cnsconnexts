import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SpaceNav } from "@/components/space-nav";
import { MissionStory } from "@/components/mission-story";
import { PeopleNetwork } from "@/components/people-network";
import { useStore } from "@/lib/store";
import { getPublicStats } from "@/lib/stats.functions";
import { getPublicPeopleNetwork } from "@/lib/people-network.functions";
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
      const [stats, publicNetwork] = await Promise.all([
        getPublicStats(),
        getPublicPeopleNetwork(),
      ]);
      return { stats, publicNetwork };
    } catch {
      return {
        stats: { participants: 0, ideas: 0, connections: 0 },
        publicNetwork: { people: [], connections: [], available: false },
      };
    }
  },
  component: Welcome,
});

function Welcome() {
  const revealRef = useScrollReveal();
  const { stats, publicNetwork } = Route.useLoaderData();
  const { users, ideas, connections, hydrated } = useStore();
  const queryClient = useQueryClient();
  const networkQuery = useQuery({
    queryKey: ["public-people-network"],
    queryFn: () => getPublicPeopleNetwork(),
    initialData: publicNetwork,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const recordedRevision = connections
    .filter((connection) => !connection.pending)
    .map((connection) => `${connection.id}:${connection.status}`)
    .sort()
    .join("|");
  useEffect(() => {
    if (hydrated) void queryClient.invalidateQueries({ queryKey: ["public-people-network"] });
  }, [recordedRevision, hydrated, queryClient]);
  const network = networkQuery.data;
  const totals = {
    people: Math.max(stats.participants, users.length),
    ideas: Math.max(stats.ideas, ideas.length),
    connections: Math.max(stats.connections, network.connections.length),
  };
  return (
    <div ref={revealRef} className="mission-home">
      <PdpaConsent />
      <SpaceNav />
      <BottomNav />
      <main id="main-content">
        <MissionStory />

        <PeopleNetwork
          users={network.people}
          connections={network.connections}
          me={null}
          hydrated={true}
          available={network.available && !networkQuery.isError}
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

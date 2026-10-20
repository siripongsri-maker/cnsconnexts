import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Chip, ConnectBurst, PowerChip } from "@/components/power-bits";
import { scoreMatch } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { issueTh, provinceTh, REGION_LABEL, GENERATION_TH } from "@/lib/i18n";
import { MissionState, MissionVisual } from "@/components/mission-ui";

export const Route = createFileRoute("/people/$id")({
  head: () => ({
    meta: [
      { title: "โปรไฟล์พลัง — คนส. Connexts" },
      { name: "description", content: "ดูว่าคนนี้มีพลังอะไรมาแบ่งปัน และกำลังมองหาอะไรอยู่" },
      { property: "og:title", content: "โปรไฟล์พลัง — คนส. Connexts" },
      { property: "og:description", content: "ดูว่าเขามีพลังอะไร และกำลังมองหาอะไร" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Person,
  notFoundComponent: () => (
    <MissionState
      code="Profile unavailable"
      title="ไม่พบโปรไฟล์นี้"
      description="โปรไฟล์อาจถูกลบ หรือลิงก์ไม่ครบ ลองค้นหาคนอื่นในเครือข่ายได้เลย"
    >
      <Link
        to="/matches"
        className="tap inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
      >
        กลับไปดูคนที่น่าเจอ
      </Link>
    </MissionState>
  ),
});

function Person() {
  const { id } = Route.useParams();
  const { users, me, connect, connections, ideas, hydrated } = useStore();
  const navigate = useNavigate();
  const [burst, setBurst] = useState(false);
  const user = users.find((u) => u.id === id);
  if (!hydrated && !user) {
    return <MissionState code="Power profile" title="กำลังเปิดโปรไฟล์…" />;
  }
  if (!user) throw notFound();

  const match = me ? scoreMatch(me, user) : null;
  const existing = connections.find(
    (c) =>
      (c.user_a === "me" && c.user_b === user.id) || (c.user_b === "me" && c.user_a === user.id),
  );
  const theirIdeas = ideas.filter((i) => i.owner_id === user.id);

  return (
    <div className="editorial-focused mission-person-page min-h-screen pb-32">
      <header className="person-masthead relative border-b border-border px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
        <MissionVisual variant="profile" />
        <Link
          to="/matches"
          aria-label="กลับไปหน้าคนที่น่าเจอ"
          className="tap mb-6 inline-grid h-11 w-11 place-items-center rounded-full bg-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <p className="mission-kicker mb-6" lang="en">
          Meet your next connection
        </p>
        <div className="person-identity flex items-end gap-4">
          <Avatar user={user} size={72} />
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-medium">{user.name}</h1>
            <p className="truncate text-sm">
              {[provinceTh(user.province), REGION_LABEL[user.region]].filter(Boolean).join(" · ")}
            </p>
            <p className="truncate text-[12px]">
              {user.organization} · {GENERATION_TH[user.generation]}
            </p>
          </div>
        </div>
      </header>

      <main id="main-content" className="person-details-grid mx-auto px-5 py-5">
        {user.bio && (
          <p className="person-bio card-soft p-6 text-[15px] leading-relaxed">“{user.bio}”</p>
        )}

        {match && (
          <div className="person-match card-soft p-6">
            <p className="mission-kicker" lang="en">
              Shared potential
            </p>
            <p className="mt-3 text-3xl font-extrabold text-gradient">แมตช์กัน {match.score}%</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{match.reason}</p>
          </div>
        )}

        <Block title="ใส่ใจเรื่อง">
          {user.interests.map((i) => (
            <Chip key={i} tone="primary">
              {issueTh(i)}
            </Chip>
          ))}
        </Block>
        <Block title="มีพลังด้าน">
          {user.powers_have.map((p) => (
            <PowerChip key={p} name={p} tone="lime" />
          ))}
        </Block>
        <Block title="กำลังมองหา">
          {user.powers_need.map((p) => (
            <PowerChip key={p} name={p} tone="coral" />
          ))}
        </Block>

        {theirIdeas.length > 0 && (
          <div className="person-ideas card-soft p-6">
            <p className="mb-2 text-xs font-extrabold text-muted-foreground">ไอเดียในตลาดพลัง</p>
            {theirIdeas.map((i) => (
              <Link
                key={i.id}
                to="/marketplace"
                className="block rounded-xl bg-accent/60 p-3 text-sm font-bold"
              >
                {i.title} →
              </Link>
            ))}
          </div>
        )}
      </main>

      {burst && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <ConnectBurst name={user.name} />
        </div>
      )}

      <div className="mission-detail-actionbar fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        {existing ? (
          <Link
            to="/connection/$id"
            params={{ id: existing.id }}
            className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl bg-lime text-base font-extrabold text-lime-foreground"
          >
            เปิดการ์ดคอนเนกชัน
          </Link>
        ) : !me ? (
          <Link
            to="/onboarding"
            className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl cta-holo px-4 text-center text-base font-extrabold text-primary-foreground"
          >
            สร้างโปรไฟล์เพื่อเชื่อมต่อ
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!match) return;
              const c = connect(user.id, match.score, match.reason);
              setBurst(true);
              setTimeout(() => setBurst(false), 1200);
              toast.success("เชื่อมกันแล้ว! ✨", {
                description: `คุณกับ ${user.name} เป็นคอนเนกชันใหม่ · New connection created`,
                action: {
                  label: "ก้าวต่อไป",
                  onClick: () => navigate({ to: "/connection/$id", params: { id: c.id } }),
                },
              });
            }}
            className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl cta-holo px-4 text-base font-extrabold text-primary-foreground"
          >
            เชื่อมต่อกับ {user.name}
          </button>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="person-power-section card-soft p-6">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  );
}

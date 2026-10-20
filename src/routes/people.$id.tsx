import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Chip, ConnectBurst, PowerChip } from "@/components/power-bits";
import { scoreMatch } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { issueTh, provinceTh, REGION_LABEL, GENERATION_TH } from "@/lib/i18n";

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
    <div className="grid min-h-screen place-items-center p-6">
      <div className="card-soft max-w-sm space-y-3 p-6 text-center">
        <p className="text-base font-extrabold">ไม่เจอโปรไฟล์นี้แล้ว</p>
        <p className="text-sm text-muted-foreground">
          อาจถูกลบไป หรือลิงก์ไม่ครบ · <span lang="en">This profile isn&apos;t available</span>
        </p>
        <Link
          to="/matches"
          className="tap inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          กลับไปดูคนที่น่าเจอ
        </Link>
      </div>
    </div>
  ),
});

function Person() {
  const { id } = Route.useParams();
  const { users, me, connect, connections, ideas, hydrated } = useStore();
  const navigate = useNavigate();
  const [burst, setBurst] = useState(false);
  const user = users.find((u) => u.id === id);
  if (!hydrated && !user) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-sm text-muted-foreground">
        กำลังเปิดโปรไฟล์…
      </div>
    );
  }
  if (!user) throw notFound();


  const match = me ? scoreMatch(me, user) : null;
  const existing = connections.find(
    (c) => (c.user_a === "me" && c.user_b === user.id) || (c.user_b === "me" && c.user_a === user.id),
  );
  const theirIdeas = ideas.filter((i) => i.owner_id === user.id);

  return (
    <div className="editorial-focused min-h-screen pb-32">
      <div className="relative border-b border-border bg-background px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
        <Link
          to="/matches"
          aria-label="กลับไปหน้าคนที่น่าเจอ"
          className="tap mb-6 inline-grid h-11 w-11 place-items-center rounded-full bg-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <div className="flex items-end gap-4">
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
      </div>

      <div className="mx-auto max-w-xl space-y-4 px-5 py-5">
        {user.bio && <p className="card-soft p-4 text-[15px] leading-relaxed">"{user.bio}"</p>}

        {match && (
          <div className="card-soft p-4">
            <p className="text-3xl font-extrabold text-gradient">แมตช์กัน {match.score}%</p>
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
          <div className="card-soft p-4">
            <p className="mb-2 text-xs font-extrabold text-muted-foreground">
              ไอเดียในตลาดพลัง
            </p>
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
      </div>

      {burst && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <ConnectBurst name={user.name} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
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
            สร้างโปรไฟล์สั้น ๆ แล้วมาเชื่อมกับ {user.name} กัน
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
    <div className="card-soft p-4">
      <p className="mb-2 text-xs font-extrabold text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

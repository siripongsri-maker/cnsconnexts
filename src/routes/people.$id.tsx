import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Chip, PowerChip } from "@/components/power-bits";
import { scoreMatch } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { issueTh, provinceTh, REGION_LABEL, GENERATION_TH } from "@/lib/i18n";

export const Route = createFileRoute("/people/$id")({
  head: () => ({
    meta: [
      { title: "โปรไฟล์ผู้เข้าร่วม — คนส. Connexts" },
      { name: "description", content: "ดูว่าคนนี้มีพลังอะไรมาแบ่งปัน และกำลังมองหาอะไรอยู่" },
      { property: "og:title", content: "โปรไฟล์ผู้เข้าร่วม — คนส. Connexts" },
      { property: "og:description", content: "ดูว่าเขามีพลังอะไร และกำลังมองหาอะไร" },
    ],
  }),
  component: Person,
  notFoundComponent: () => <p className="p-8 text-center text-sm">ไม่พบผู้เข้าร่วมคนนี้</p>,
});

function Person() {
  const { id } = Route.useParams();
  const { users, me, connect, connections, ideas, hydrated } = useStore();
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
    <div className="min-h-screen bg-background pb-32">
      <div className="relative gradient-power px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-primary-foreground">
        <Link
          to="/matches"
          className="tap mb-6 inline-grid h-9 w-9 place-items-center rounded-full bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-end gap-4">
          <Avatar user={user} size={72} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold">{user.name}</h1>
            <p className="truncate text-sm opacity-90">
              {provinceTh(user.province)} · {REGION_LABEL[user.region]}
            </p>
            <p className="truncate text-[12px] opacity-80">
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
            <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
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

      <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        {existing ? (
          <Link
            to="/connection/$id"
            params={{ id: existing.id }}
            className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl bg-lime text-base font-extrabold text-lime-foreground"
          >
            เปิดการ์ดคอนเนกชัน
          </Link>
        ) : (
          <button
            onClick={() => {
              if (!me || !match) return;
              connect(user.id, match.score, match.reason);
              toast.success("เชื่อมต่อสำเร็จแล้ว! ✨");
            }}
            className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl gradient-power text-base font-extrabold text-primary-foreground"
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
      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

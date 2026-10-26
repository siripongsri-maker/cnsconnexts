import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { MatchCelebration } from "@/components/match-celebration";
import { MeadowState, STATE_PRIMARY } from "@/components/meadow-state";
import { Avatar, IssueBlock, PowerPill, ScoreRing } from "@/components/power-bits";
import { scoreMatch } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { provinceTh, REGION_LABEL, GENERATION_TH } from "@/lib/i18n";

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
    <MeadowState
      title="ไม่พบโปรไฟล์นี้"
      description="โปรไฟล์อาจถูกลบ หรือลิงก์ไม่ครบ ลองจับคู่กับคนอื่นในเครือข่ายได้เลย"
    >
      <Link to="/" className={STATE_PRIMARY}>
        กลับไปจับคู่
      </Link>
    </MeadowState>
  ),
});

function Person() {
  const { id } = Route.useParams();
  const { users, me, connect, connections, ideas, hydrated } = useStore();
  const [celebration, setCelebration] = useState<{ connectionId: string; reason: string } | null>(
    null,
  );
  const user = users.find((u) => u.id === id);
  if (!hydrated && !user) {
    return <MeadowState loading title="กำลังเปิดโปรไฟล์…" />;
  }
  if (!user) throw notFound();

  const match = me ? scoreMatch(me, user) : null;
  const existing = connections.find(
    (c) =>
      (c.user_a === "me" && c.user_b === user.id) || (c.user_b === "me" && c.user_a === user.id),
  );
  const theirIdeas = ideas.filter((i) => i.owner_id === user.id);
  const place = [provinceTh(user.province), REGION_LABEL[user.region]].filter(Boolean).join(" · ");
  const work = [user.organization, GENERATION_TH[user.generation]].filter(Boolean).join(" · ");

  return (
    <div className="min-h-dvh pb-40">
      <header className="bg-sky-soft pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto w-full max-w-xl px-4 lg:max-w-3xl">
          <Link
            to="/"
            aria-label="กลับไปหน้าจับคู่"
            className="tap inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-4 text-body font-semibold text-ink shadow-[0_6px_16px_-10px_rgba(43,40,120,0.45)]"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden />
            ย้อนกลับ
          </Link>
          <div className="mt-5 flex items-center gap-4">
            <Avatar user={user} size={72} />
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-title font-bold text-ink [overflow-wrap:anywhere]">
                {user.name}
              </h1>
              {place && <p className="text-body text-ink-soft [overflow-wrap:anywhere]">{place}</p>}
              {work && <p className="text-body text-ink-soft [overflow-wrap:anywhere]">{work}</p>}
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5 lg:max-w-3xl"
      >
        {match && (
          <section aria-label="ความเข้ากัน" className="meadow-card flex items-center gap-4 p-5">
            <ScoreRing score={match.score} size={84} />
            <div className="min-w-0 flex-1">
              <p className="font-heading text-lead font-semibold text-ink">แมตช์กัน</p>
              <p className="text-body text-ink-soft [overflow-wrap:anywhere]">{match.reason}</p>
            </div>
          </section>
        )}

        {user.bio && (
          <p className="meadow-card p-5 text-body text-ink [overflow-wrap:anywhere]">
            “{user.bio}”
          </p>
        )}

        {user.interests.length > 0 && (
          <Block title="ใส่ใจเรื่อง">
            {user.interests.map((i) => (
              <IssueBlock key={i} issue={i} />
            ))}
          </Block>
        )}
        {user.powers_have.length > 0 && (
          <Block title="มีพลังด้าน">
            {user.powers_have.map((p) => (
              <PowerPill key={p} name={p} kind="have" />
            ))}
          </Block>
        )}
        {user.powers_need.length > 0 && (
          <Block title="กำลังมองหา">
            {user.powers_need.map((p) => (
              <PowerPill key={p} name={p} kind="need" />
            ))}
          </Block>
        )}

        {theirIdeas.length > 0 && (
          <section aria-labelledby="their-ideas" className="meadow-card p-5">
            <h2 id="their-ideas" className="mb-3 font-heading text-lead font-semibold text-ink">
              ไอเดียของเขา
            </h2>
            <ul className="flex flex-col gap-2">
              {theirIdeas.map((i) => (
                <li key={i.id}>
                  <Link
                    to="/marketplace"
                    className="tap flex min-h-14 items-center justify-between gap-2 rounded-2xl bg-sky-soft px-4 py-2 text-body font-semibold text-ink"
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">{i.title}</span>
                    <ChevronRight className="h-6 w-6 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {celebration && me && (
        <MatchCelebration
          me={me}
          other={user}
          reason={celebration.reason}
          connectionId={celebration.connectionId}
          onClose={() => setCelebration(null)}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E6E3F2] bg-paper px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto w-full max-w-xl lg:max-w-3xl">
          {existing ? (
            <Link
              to="/connection/$id"
              params={{ id: existing.id }}
              className="meadow-btn-primary tap w-full text-center"
            >
              เชื่อมกันแล้ว · ทำอะไรต่อ
            </Link>
          ) : !me ? (
            <Link to="/onboarding" className="meadow-btn-primary tap w-full text-center">
              สร้างโปรไฟล์เพื่อเชื่อมต่อ
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!match) return;
                const c = connect(user.id, match.score, match.reason);
                setCelebration({ connectionId: c.id, reason: match.reason });
              }}
              className="meadow-btn-primary tap w-full py-2 text-center [overflow-wrap:anywhere]"
            >
              ขอเชื่อมต่อกับ {user.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="meadow-card p-5">
      <h2 className="mb-3 font-heading text-lead font-semibold text-ink">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

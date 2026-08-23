import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Avatar, Chip } from "@/components/power-bits";
import { scoreMatch } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { ISSUES, REGIONS, type Region } from "@/lib/types";
import { issueTh, REGION_LABEL } from "@/lib/i18n";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "ตลาดพลัง — คนส. Connect" },
      {
        name: "description",
        content: "จับคู่ไอเดียกับพลัง! เลือกโปรเจกต์ที่กำลังมองหาพาร์ตเนอร์ ทุน คอนเนกชัน หรือความรู้ท้องถิ่น",
      },
      { property: "og:title", content: "ตลาดพลัง — คนส. Connect" },
      { property: "og:description", content: "ตลาดแลกเปลี่ยนพลังและไอเดีย" },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const { ideas, users, savedIdeas, toggleSaveIdea, connect, connections, me } = useStore();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [need, setNeed] = useState<string | null>(null);

  const needOptions = useMemo(
    () => Array.from(new Set(ideas.flatMap((i) => i.resources_need))),
    [ideas],
  );

  const filtered = ideas.filter(
    (i) =>
      (!issue || i.issues.includes(issue)) &&
      (!region || i.region === region) &&
      (!need || i.resources_need.includes(need)),
  );

  return (
    <AppShell title="ตลาดพลัง" subtitle="Power Marketplace · ตลาดแลกเปลี่ยนพลังและไอเดีย">
      <div className="space-y-2 px-5 py-3">
        <Row>
          <Pill active={!issue} onClick={() => setIssue(null)}>
            ทุกประเด็น
          </Pill>
          {ISSUES.filter((i) => i !== "Other").map((i) => (
            <Pill key={i} active={issue === i} onClick={() => setIssue(i)}>
              {issueTh(i)}
            </Pill>
          ))}
        </Row>
        <Row>
          <Pill active={!region} onClick={() => setRegion(null)}>
            ทุกภูมิภาค
          </Pill>
          {REGIONS.map((r) => (
            <Pill key={r} active={region === r} onClick={() => setRegion(r)}>
              {REGION_LABEL[r]}
            </Pill>
          ))}
        </Row>
        <Row>
          <Pill active={!need} onClick={() => setNeed(null)}>
            ต้องการอะไรก็ได้
          </Pill>
          {needOptions.map((n) => (
            <Pill key={n} active={need === n} onClick={() => setNeed(n)}>
              ต้องการ {n}
            </Pill>
          ))}
        </Row>
      </div>

      <div className="space-y-3 px-5 pb-6">
        {filtered.map((idea, idx) => {
          const owner = users.find((u) => u.id === idea.owner_id);
          const saved = savedIdeas.includes(idea.id);
          return (
            <article
              key={idea.id}
              className="card-soft animate-rise overflow-hidden"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="gradient-power h-1.5 w-full" />
              <div className="p-4">
                <h3 className="text-lg font-extrabold leading-tight">{idea.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {idea.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip tone="electric">📍 {REGION_LABEL[idea.region]}</Chip>
                  {idea.issues.map((i) => (
                    <Chip key={i} tone="primary">
                      {issueTh(i)}
                    </Chip>
                  ))}
                </div>

                {owner && (
                  <div className="mt-3 flex items-center gap-2">
                    <Avatar user={owner} size={32} />
                    <p className="min-w-0 truncate text-[12px] font-semibold">
                      {owner.name} · <span className="text-muted-foreground">{owner.organization}</span>
                    </p>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-lime/20 p-3">
                    <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-lime-foreground">
                      มีให้
                    </p>
                    <ul className="space-y-0.5 text-[12px] font-semibold">
                      {idea.resources_have.map((r) => (
                        <li key={r}>· {r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-coral/10 p-3">
                    <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-coral">
                      ต้องการ
                    </p>
                    <ul className="space-y-0.5 text-[12px] font-semibold">
                      {idea.resources_need.map((r) => (
                        <li key={r}>· {r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      if (!me || !owner) {
                        navigate({ to: "/onboarding" });
                        return;
                      }
                      const existing = connections.find(
                        (c) =>
                          (c.user_a === "me" && c.user_b === owner.id) ||
                          (c.user_b === "me" && c.user_a === owner.id),
                      );
                      const m = scoreMatch(me, owner);
                      const conn = existing ?? connect(owner.id, m.score, m.reason);
                      toast.success("เชื่อมต่อสำเร็จแล้ว! ✨", {
                        description: `ตอนนี้มาคิดกันว่าจะทำอะไรกับ ${owner.name} ดี`,
                      });
                      navigate({ to: "/connection/$id", params: { id: conn.id } });
                    }}
                    className="tap h-12 flex-1 rounded-xl gradient-power text-sm font-extrabold text-primary-foreground"
                  >
                    อยากเชื่อมต่อ
                  </button>
                  <button
                    onClick={() => toggleSaveIdea(idea.id)}
                    aria-label="บันทึกไอเดีย"
                    className={`tap grid h-12 w-12 place-items-center rounded-xl border ${
                      saved ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                    }`}
                  >
                    {saved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar flex gap-1.5 overflow-x-auto">{children}</div>;
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

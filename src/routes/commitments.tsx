import { createFileRoute, Link } from "@tanstack/react-router";
import { FollowUpTabs } from "@/components/follow-up-tabs";
import { toast } from "sonner";
import { CalendarDays, Check, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MissionVisual } from "@/components/mission-ui";
import { LiveProgress } from "@/components/live-progress";
import { Avatar } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import type { ConnectionStatus } from "@/lib/types";
import { STATUS_TH } from "@/lib/i18n";

export const Route = createFileRoute("/commitments")({
  head: () => ({
    meta: [
      { title: "จะทำอะไรต่อดี? — คนส. Connexts" },
      {
        name: "description",
        content: "รวมคอนเนกชันและคำมั่นสัญญาที่คุณสร้างไว้ ตั้งแต่วางแผนจนถึงทำสำเร็จ",
      },
      { property: "og:title", content: "จะทำอะไรต่อดี? — คนส. Connexts" },
      { property: "og:description", content: "รู้จักกันแล้ว แล้วเราจะทำอะไรต่อ?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Commitments,
});

const DOT: Record<ConnectionStatus, string> = {
  Connected: "⚪️",
  Planning: "🟡",
  "In Progress": "🔵",
  Completed: "🟢",
};

const STATUSES: ConnectionStatus[] = ["Connected", "Planning", "In Progress", "Completed"];

function Commitments() {
  const { connections, commitments, users, me, updateCommitment } = useStore();

  const mine = connections.filter((c) => c.user_a === "me" || c.user_b === "me");
  const myCommitments = commitments.filter((m) => mine.some((c) => c.id === m.connection_id));
  const shown = myCommitments;
  const shownConnections = mine;
  const ready = mine.filter((c) => !commitments.some((m) => m.connection_id === c.id));

  const partnerOf = (connId: string) => {
    const c = connections.find((x) => x.id === connId);
    if (!c) return null;
    const isMine = c.user_a === "me" || c.user_b === "me";
    const otherId = c.user_a === "me" ? c.user_b : c.user_a;
    return {
      other: users.find((u) => u.id === otherId) ?? null,
      first: isMine ? me : (users.find((u) => u.id === c.user_a) ?? me),
      conn: c,
    };
  };

  return (
    <AppShell title="ก้าวต่อไปของเรา" titleEn="Next steps">
      <div className="core-page core-commitments">
        <FollowUpTabs />
        <div className="core-progress-overview">
          <div className="core-progress-main px-5 pt-3">
            <LiveProgress />
          </div>

          <div className="core-commitment-stats grid grid-cols-2 gap-3 px-5 py-4">
            <div className="card-soft p-4">
              <p className="font-tech text-3xl font-extrabold text-gradient">
                {shownConnections.length}
              </p>
              <p className="text-xs font-bold text-muted-foreground">คอนเนกชันของฉัน</p>
            </div>
            <div className="card-soft p-4">
              <p className="font-tech text-3xl font-extrabold text-gradient">{shown.length}</p>
              <p className="text-xs font-bold text-muted-foreground">คำมั่นสัญญาของฉัน</p>
            </div>
          </div>
        </div>

        {ready.length > 0 && (
          <section className="core-ready-section px-5 pb-4" aria-labelledby="ready-heading">
            <h2 id="ready-heading" className="text-base font-extrabold">
              ชวนกันตั้งก้าวแรก
            </h2>
            <ul className="core-ready-grid mt-3">
              {ready.map((c) => {
                const partner = partnerOf(c.id)?.other;
                return (
                  <li key={c.id} className="card-soft flex items-center gap-3 p-3">
                    {partner && <Avatar user={partner} size={34} />}
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">
                      {partner?.name ?? "คอนเนกชันใหม่"}
                    </p>
                    <Link
                      to="/connection/$id"
                      params={{ id: c.id }}
                      aria-label={`วางแผนก้าวแรกกับ ${partner?.name ?? "คอนเนกชันนี้"}`}
                      className="tap inline-flex min-h-11 shrink-0 items-center rounded-xl bg-primary px-3 text-xs font-extrabold text-primary-foreground"
                    >
                      วางแผน →
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="core-section-head core-commitment-title">
          <div>
            <p className="mission-kicker">FROM CONNECTION TO ACTION</p>
            <h2>แผนที่เราจะทำร่วมกัน</h2>
          </div>
          <span className="core-data-count">
            {shown.length}
            <span>แผนของฉัน</span>
          </span>
        </div>
        <div id="my-commitments" className="core-commitment-grid scroll-mt-20 px-5 pb-6">
          {mine.length === 0 ? (
            <div className="core-empty mission-empty">
              <MissionVisual variant="action" className="core-empty-visual" />
              <p className="mission-kicker">YOUR NEXT MOVE</p>
              <h2 className="text-lg font-extrabold">ยังไม่มีคอนเนกชัน</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                หาคนที่พลังเสริมกัน แล้ววางแผนร่วมทำ
              </p>
              <Link
                to="/matches"
                className="tap mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-extrabold text-primary-foreground"
              >
                ไปหาคนที่น่าเจอ
              </Link>
            </div>
          ) : shown.length === 0 ? (
            <Link
              to="/calendar"
              className="tap card-soft flex min-h-11 items-center justify-between gap-2 p-4 text-sm font-bold"
            >
              <span>เชื่อมต่อแล้ว ชวนกันนัดก้าวแรก</span>
              <span aria-hidden className="text-primary">
                →
              </span>
            </Link>
          ) : null}

          {shown.map((m, idx) => {
            const info = partnerOf(m.connection_id);
            const other = info?.other;
            const first = info?.first;
            const isMine = !!info && (info.conn.user_a === "me" || info.conn.user_b === "me");
            return (
              <article
                key={m.id}
                className="core-commitment-card card-soft animate-rise p-4"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="core-card-index">
                  <span>ACTION / {String(idx + 1).padStart(2, "0")}</span>
                  <span>{STATUS_TH[m.status]}</span>
                </div>
                <div className="flex items-center gap-2">
                  {first && <Avatar user={first} size={34} />}
                  {other && <Avatar user={other} size={34} />}
                  <p className="min-w-0 flex-1 truncate text-sm font-extrabold uppercase">
                    {first?.name ?? "คุณ"} + {other?.name ?? "พาร์ตเนอร์"}
                  </p>
                </div>
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary">
                  <span aria-hidden>{DOT[m.status]}</span> สถานะ: {STATUS_TH[m.status]}
                </p>
                <p className="mt-2 text-[15px] font-semibold leading-snug">"{m.description}"</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">{m.action_type}</p>
                {m.follow_up_date ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <CalendarDays className="h-4 w-4" aria-hidden /> นัดไว้{" "}
                    {new Date(m.follow_up_date).toLocaleString("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    น.
                  </p>
                ) : null}
                {isMine && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!m.follow_up_date && m.status !== "Completed" && (
                      <Link
                        to="/calendar"
                        className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-bold"
                      >
                        <CalendarDays className="h-4 w-4" aria-hidden /> นัดวันลงมือ
                      </Link>
                    )}
                    <Link
                      to="/chat/$id"
                      params={{ id: m.connection_id }}
                      className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-bold text-primary"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden /> คุยต่อ
                    </Link>
                  </div>
                )}
                <div
                  role="group"
                  aria-label="เปลี่ยนสถานะ"
                  className="core-status-grid mt-3 grid grid-cols-2 gap-2"
                >
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={m.status === s}
                      onClick={() => {
                        if (m.status === s) return;
                        updateCommitment(m.id, { status: s });
                        toast.success(`อัปเดตเป็น “${STATUS_TH[s]}” แล้ว`, {
                          description: other?.name,
                        });
                      }}
                      className={`tap inline-flex min-h-11 items-center justify-center gap-1 rounded-full border px-3 text-xs font-bold ${
                        m.status === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {m.status === s ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <span aria-hidden>{DOT[s]}</span>
                      )}
                      {STATUS_TH[s]}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}

          {mine.length > 0 && (
            <Link
              to="/matches"
              className="tap flex h-14 items-center justify-center rounded-2xl border border-dashed border-primary/50 text-sm font-extrabold text-primary"
            >
              + เพิ่มคอนเนกชัน
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}

import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
  useCanGoBack,
  notFound,
} from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Avatar, IssueBlock } from "@/components/power-bits";
import { ChatRoom } from "@/components/chat-room";
import { ChoicePill } from "@/components/choice-pill";
import { MeadowState, STATE_PRIMARY } from "@/components/meadow-state";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { useStore } from "@/lib/store";
import type { ConnectionStatus } from "@/lib/types";
import { powerTh, STATUS_TH, ACTION_TYPES_TH } from "@/lib/i18n";

export const Route = createFileRoute("/connection/$id")({
  head: () => ({
    meta: [
      { title: "จะลุยด้วยกันแบบไหนดี? — คนส. Connexts" },
      {
        name: "description",
        content: "แปลงคอนเนกชันใหม่ให้กลายเป็นก้าวต่อไปจริง ๆ ด้วยคำมั่นสัญญาที่ตกลงร่วมกัน",
      },
      { property: "og:title", content: "การ์ดคอนเนกชันของคุณ — คนส. Connexts" },
      { property: "og:description", content: "เจอกันแล้ว ทำอะไรต่อดี?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConnectionDetail,
  notFoundComponent: () => (
    <MeadowState title="ยังไม่พบคู่นี้" description="ลองเปิดจากรายการคู่ของคุณอีกครั้ง">
      <Link to="/commitments" className={STATE_PRIMARY}>
        กลับไปที่คู่ของฉัน
      </Link>
    </MeadowState>
  ),
});

function ConnectionDetail() {
  const { id } = Route.useParams();
  const { connections, users, me, addCommitment, commitments, hydrated } = useStore();
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const [action, setAction] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("Planning");

  const conn = connections.find((c) => c.id === id);
  const a = conn ? (users.find((u) => u.id === conn.user_a) ?? me) : null;
  const b = conn ? (users.find((u) => u.id === conn.user_b) ?? null) : null;

  // ระหว่างที่ยังโหลดข้อมูลจากฐานข้อมูลไม่เสร็จ อย่าเพิ่งบอกว่า "ไม่พบ"
  if (!hydrated) {
    return <MeadowState loading title="กำลังเปิดหน้าของคู่นี้…" />;
  }

  if (!conn || !a || !b) throw notFound();

  const myCommitments = commitments.filter((m) => m.connection_id === conn.id);
  const sharedIssues = a.interests.filter((i) => b.interests.includes(i));
  const powerCombo = [
    ...new Set([a.powers_have[0], b.powers_have[0]].filter((p): p is string => Boolean(p))),
  ].map(powerTh);

  return (
    <div className="min-h-dvh pb-48">
      <header className="bg-sky-soft pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto w-full max-w-xl px-4 lg:max-w-3xl">
          <button
            type="button"
            aria-label="ย้อนกลับ"
            onClick={() => (canGoBack ? router.history.back() : navigate({ to: "/commitments" }))}
            className="tap inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-4 text-body font-semibold text-ink shadow-[0_6px_16px_-10px_rgba(43,40,120,0.45)]"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden="true" />
            ย้อนกลับ
          </button>
          <div className="mt-5 flex items-center justify-center gap-3" aria-hidden="true">
            <Avatar user={a} size={64} />
            <span className="h-0.5 w-8 rounded-full bg-primary/40" />
            <span className="h-3 w-3 rounded-full bg-primary" />
            <span className="h-0.5 w-8 rounded-full bg-primary/40" />
            <Avatar user={b} size={64} />
          </div>
          <h1 className="mt-4 text-center font-heading text-title font-bold text-ink [overflow-wrap:anywhere]">
            {a.name} × {b.name}
          </h1>
          <p className="mt-1 text-center text-body text-ink-soft">แมตช์กัน {conn.match_score}%</p>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5 lg:max-w-3xl"
      >
        <section aria-label="สรุปคู่นี้" className="meadow-card p-5">
          {powerCombo.length > 0 && (
            <>
              <p className="text-body text-ink-soft">พลังรวมของเรา</p>
              <p className="font-heading text-lead font-semibold text-ink [overflow-wrap:anywhere]">
                {powerCombo.join(" + ")}
              </p>
            </>
          )}
          {sharedIssues.length > 0 && (
            <>
              <p className="mt-4 text-body text-ink-soft">สนใจประเด็นเดียวกัน</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sharedIssues.map((i) => (
                  <IssueBlock key={i} issue={i} />
                ))}
              </div>
            </>
          )}
          {conn.match_reason && (
            <p className="mt-4 text-body text-ink [overflow-wrap:anywhere]">{conn.match_reason}</p>
          )}
        </section>

        {myCommitments.length > 0 && (
          <section aria-labelledby="agreed-h" className="meadow-card p-5">
            <h2 id="agreed-h" className="font-heading text-lead font-semibold text-ink">
              ก้าวต่อไปที่ตกลงกันแล้ว
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {myCommitments.map((m) => (
                <li key={m.id} className="rounded-2xl bg-sky-soft p-4">
                  <p className="text-body font-semibold text-ink [overflow-wrap:anywhere]">
                    {m.action_type}
                  </p>
                  {m.description && m.description !== m.action_type && (
                    <p className="text-body text-ink-soft [overflow-wrap:anywhere]">
                      {m.description}
                    </p>
                  )}
                  {m.follow_up_date && (
                    <p className="mt-2 flex items-start gap-2 text-body font-semibold text-primary">
                      <CalendarDays className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
                      <span>
                        นัด{" "}
                        {new Date(m.follow_up_date).toLocaleString("th-TH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}{" "}
                        น.
                      </span>
                    </p>
                  )}
                  {m.follow_up_date ? (
                    <RsvpButtons m={m} />
                  ) : (
                    <Link
                      to="/calendar"
                      className="meadow-btn-secondary tap mt-3 w-full py-2 text-center"
                    >
                      ยังไม่ได้นัดวัน · นัดวันคุยกันเลย
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="meadow-card p-5">
          <h2 id="together-h" className="scroll-mt-4 font-heading text-lead font-semibold text-ink">
            จะลุยด้วยกันแบบไหนดี?
          </h2>
          <p className="mt-1 text-body text-ink-soft">เลือกสิ่งที่อยากเริ่มด้วยกัน</p>
          <div role="group" aria-labelledby="together-h" className="mt-3 flex flex-wrap gap-2">
            {ACTION_TYPES_TH.map((act) => (
              <ChoicePill key={act} active={action === act} onClick={() => setAction(act)}>
                {act}
              </ChoicePill>
            ))}
          </div>
        </section>

        <section className="meadow-card p-5">
          <label htmlFor="next-step" className="block text-body font-semibold text-ink">
            ก้าวต่อไปของเรา <span className="font-normal text-ink-soft">(ไม่บังคับ)</span>
          </label>
          <textarea
            id="next-step"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="เช่น จัดแคมเปญดิจิทัลเพื่อเยาวชนร่วมกันก่อนสิ้นปีนี้"
            className="mt-2 w-full rounded-2xl border-2 bg-white p-4 text-body text-ink outline-none placeholder:text-ink-soft/70"
          />
        </section>

        <section className="meadow-card p-5">
          <p id="status-l" className="text-body font-semibold text-ink">
            ตอนนี้เราอยู่ขั้นไหน?
          </p>
          <div role="group" aria-labelledby="status-l" className="mt-3 flex flex-wrap gap-2">
            {(["Connected", "Planning", "In Progress", "Completed"] as ConnectionStatus[]).map(
              (s) => (
                <ChoicePill key={s} active={status === s} onClick={() => setStatus(s)}>
                  {STATUS_TH[s]}
                </ChoicePill>
              ),
            )}
          </div>
        </section>

        <ChatRoom connectionId={conn.id} compact />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E6E3F2] bg-paper px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto w-full max-w-xl lg:max-w-3xl">
          <button
            type="button"
            disabled={!action}
            aria-describedby={!action ? "cta-hint" : undefined}
            onClick={() => {
              addCommitment({
                connection_id: conn.id,
                action_type: action!,
                description: text.trim() || action!,
                status,
                follow_up_date: null,
              });
              toast.success("สร้างคำมั่นสัญญาแล้ว", {
                description: "ดูได้ในแท็บ คู่ของฉัน ในหัวข้อ สิ่งที่ตกลงจะทำ",
              });
              navigate({ to: "/commitments" });
            }}
            className="meadow-btn-primary tap w-full text-center"
          >
            สร้างคำมั่นสัญญา
          </button>
          {!action && (
            <p id="cta-hint" className="mt-2 text-center text-body text-ink-soft">
              เลือกสิ่งที่อยากทำด้วยกัน 1 อย่างเพื่อไปต่อ
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

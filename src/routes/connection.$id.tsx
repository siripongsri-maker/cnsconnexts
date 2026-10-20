import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
  useCanGoBack,
  notFound,
} from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Chip } from "@/components/power-bits";
import { ChatRoom } from "@/components/chat-room";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { useStore } from "@/lib/store";
import type { ConnectionStatus } from "@/lib/types";
import { issueTh, powerTh, STATUS_TH, ACTION_TYPES_TH } from "@/lib/i18n";
import { MissionState, MissionVisual } from "@/components/mission-ui";

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
    <MissionState
      code="Connection unavailable"
      title="ยังไม่พบคอนเนกชันนี้"
      description="ลองเปิดจากรายการคู่เชื่อมของคุณอีกครั้ง"
    >
      <Link
        to="/matches"
        className="tap mt-4 inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
      >
        กลับไปหาคู่เชื่อม
      </Link>
    </MissionState>
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
    return <MissionState code="Your connection" title="กำลังเปิดคอนเนกชัน…" />;
  }

  if (!conn || !a || !b) throw notFound();

  const myCommitments = commitments.filter((m) => m.connection_id === conn.id);
  const sharedIssues = a.interests.filter((i) => b.interests.includes(i));
  const powerCombo = [
    ...new Set([a.powers_have[0], b.powers_have[0]].filter((p): p is string => Boolean(p))),
  ].map(powerTh);

  return (
    <div className="editorial-focused mission-connection-page min-h-screen pb-36">
      <header className="connection-masthead relative border-b border-border px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
        <MissionVisual variant="action" />
        <button
          type="button"
          aria-label="ย้อนกลับ"
          onClick={() => (canGoBack ? router.history.back() : navigate({ to: "/matches" }))}
          className="tap mb-6 inline-grid h-11 w-11 place-items-center rounded-full bg-accent"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="mission-kicker mb-6" lang="en">
          From connection to action
        </p>
        <div className="connection-portraits flex items-center justify-center gap-3">
          <Avatar user={a} size={64} />
          <span className="h-0.5 w-8 bg-border" />
          <span className="h-3 w-3 rounded-full bg-electric" />
          <span className="h-0.5 w-8 bg-border" />
          <Avatar user={b} size={64} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold">
          {a.name} × {b.name}
        </h1>
        <p className="mt-1 text-center text-sm opacity-90">แมตช์กัน {conn.match_score}%</p>
      </header>

      <main id="main-content" className="connection-content-grid mx-auto px-5 py-5">
        <div className="connection-summary card-soft p-6">
          {powerCombo.length > 0 && (
            <>
              <p className="text-xs font-extrabold text-muted-foreground">พลังรวมของเรา</p>
              <p className="mt-1 text-lg font-extrabold leading-snug">{powerCombo.join(" + ")}</p>
            </>
          )}
          {sharedIssues.length > 0 && (
            <>
              <p className="mb-1.5 mt-3 text-xs font-bold text-muted-foreground">
                สนใจประเด็นเดียวกัน
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sharedIssues.map(issueTh).map((s) => (
                  <Chip key={s} tone="primary">
                    {s}
                  </Chip>
                ))}
              </div>
            </>
          )}
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            {conn.match_reason}
          </p>
        </div>

        {myCommitments.length > 0 && (
          <section className="connection-agreements mission-panel">
            <p className="mb-2 text-xs font-extrabold text-muted-foreground">
              ก้าวต่อไปที่ตกลงกันแล้ว
            </p>
            <ul className="space-y-3">
              {myCommitments.map((m) => (
                <li key={m.id} className="rounded-2xl bg-accent/50 p-3">
                  <p className="text-sm font-bold">{m.action_type}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                  {m.follow_up_date && (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      นัด{" "}
                      {new Date(m.follow_up_date).toLocaleString("th-TH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      น.
                    </p>
                  )}
                  {m.follow_up_date ? (
                    <RsvpButtons m={m} />
                  ) : (
                    <Link
                      to="/calendar"
                      className="tap mt-1 inline-flex min-h-11 items-center text-xs font-bold text-primary"
                    >
                      ยังไม่ได้นัดวัน · นัดวันคุยกันเลย →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="connection-plan mission-panel">
          <h2 id="together-h" className="scroll-mt-4 text-xl font-extrabold">
            จะลุยด้วยกันแบบไหนดี?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">เลือกสิ่งที่อยากเริ่มด้วยกัน</p>
          <div role="group" aria-labelledby="together-h" className="mt-3 flex flex-wrap gap-2">
            {ACTION_TYPES_TH.map((act) => (
              <button
                key={act}
                type="button"
                aria-pressed={action === act}
                onClick={() => setAction(act)}
                className={`tap inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2.5 text-[13px] font-bold ${
                  action === act
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card"
                }`}
              >
                {action === act && <Check className="h-4 w-4" aria-hidden="true" />}
                {act}
              </button>
            ))}
          </div>
        </div>

        <div className="connection-next-step mission-panel">
          <label
            htmlFor="next-step"
            className="mb-2 block text-xs font-extrabold text-muted-foreground"
          >
            ก้าวต่อไปของเรา <span className="font-normal">(ไม่บังคับ)</span>
          </label>
          <textarea
            id="next-step"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="เช่น จัดแคมเปญดิจิทัลเพื่อเยาวชนร่วมกันก่อนสิ้นปีนี้"
            className="w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="connection-stage mission-panel">
          <p id="status-l" className="mb-2 text-xs font-extrabold text-muted-foreground">
            ตอนนี้เราอยู่ขั้นไหน?
          </p>
          <div role="group" aria-labelledby="status-l" className="flex flex-wrap gap-2">
            {(["Connected", "Planning", "In Progress", "Completed"] as ConnectionStatus[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`tap inline-flex min-h-11 items-center rounded-full border px-4 text-[12px] font-bold ${
                    status === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {STATUS_TH[s]}
                </button>
              ),
            )}
          </div>
        </div>

        <ChatRoom connectionId={conn.id} compact />
      </main>

      <div className="mission-detail-actionbar fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
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
            toast.success("สร้างคำมั่นสัญญาแล้ว 🎉", {
              description: "ดูได้ในลิสต์ 'จะทำอะไรต่อดี?' ของคุณ",
            });
            navigate({ to: "/commitments" });
          }}
          className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl cta-holo text-base font-extrabold text-primary-foreground disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          สร้างคำมั่นสัญญา
        </button>
        {!action && (
          <p
            id="cta-hint"
            className="mx-auto mt-1.5 max-w-xl text-center text-xs text-muted-foreground"
          >
            เลือกสิ่งที่อยากทำด้วยกัน 1 อย่างเพื่อไปต่อ
          </p>
        )}
      </div>
    </div>
  );
}

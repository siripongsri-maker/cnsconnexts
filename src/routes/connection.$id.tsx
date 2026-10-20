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
    <div className="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <p className="text-sm">ไม่เจอคอนเนกชันนี้นะ อาจถูกลบไปแล้ว หรือเน็ตยังไม่มา</p>
        <Link
          to="/matches"
          className="tap mt-4 inline-flex min-h-11 items-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          กลับไปดูคนที่น่าเชื่อมต่อ{" "}
          <span lang="en" className="ml-1 opacity-80">
            · Back to matches
          </span>
        </Link>
      </div>
    </div>
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
  const a = conn ? users.find((u) => u.id === conn.user_a) ?? me : null;
  const b = conn ? users.find((u) => u.id === conn.user_b) ?? null : null;

  // ระหว่างที่ยังโหลดข้อมูลจากฐานข้อมูลไม่เสร็จ อย่าเพิ่งบอกว่า "ไม่พบ"
  if (!hydrated) {
    return (
      <div
        role="status"
        className="grid min-h-screen place-items-center p-8 text-sm text-muted-foreground"
      >
        กำลังเปิดคอนเนกชัน…
      </div>
    );
  }

  if (!conn || !a || !b) throw notFound();

  const myCommitments = commitments.filter((m) => m.connection_id === conn.id);
  const sharedIssues = a.interests.filter((i) => b.interests.includes(i));
  const powerCombo = [
    ...new Set([a.powers_have[0], b.powers_have[0]].filter((p): p is string => Boolean(p))),
  ].map(powerTh);

  return (
    <div className="editorial-focused min-h-screen pb-36">
      <div className="relative border-b border-border bg-background px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
        <button
          type="button"
          aria-label="ย้อนกลับ"
          onClick={() => (canGoBack ? router.history.back() : navigate({ to: "/matches" }))}
          className="tap mb-6 inline-grid h-11 w-11 place-items-center rounded-full bg-accent"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center justify-center gap-3">
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
      </div>

      <div className="mx-auto max-w-xl space-y-4 px-5 py-5">
        <div className="card-soft p-4">
          {powerCombo.length > 0 && (
            <>
              <p className="text-xs font-extrabold text-muted-foreground">
                พลังรวมของเรา <span lang="en">· Shared Power</span>
              </p>
              <p className="mt-1 text-lg font-extrabold leading-snug">{powerCombo.join(" + ")}</p>
            </>
          )}
          {sharedIssues.length > 0 && (
            <>
              <p className="mb-1.5 mt-3 text-xs font-bold text-muted-foreground">สนใจประเด็นเดียวกัน</p>
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
          <section>
            <p className="mb-2 text-xs font-extrabold text-muted-foreground">
              ก้าวต่อไปที่ตกลงกันแล้ว <span lang="en">· What happens next</span>
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

        <div>
          <h2 id="together-h" className="scroll-mt-4 text-xl font-extrabold">
            จะลุยด้วยกันแบบไหนดี?
          </h2>
          <p className="text-sm font-semibold text-primary">เราจะทำอะไรร่วมกันได้บ้าง?</p>
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

        <div>
          <label
            htmlFor="next-step"
            className="mb-2 block text-xs font-extrabold text-muted-foreground"
          >
            ก้าวต่อไปของเรา{" "}
            <span className="font-normal">
              (ไม่ใส่ก็ได้ · <span lang="en">optional</span>)
            </span>
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

        <div>
          <p id="status-l" className="mb-2 text-xs font-extrabold text-muted-foreground">
            ตอนนี้เราอยู่ขั้นไหนแล้ว? <span lang="en">· Where are we now?</span>
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
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
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
            toast.success("สร้างคำมั่นสัญญาแล้ว 🎉", { description: "ดูได้ในลิสต์ 'จะทำอะไรต่อดี?' ของคุณ" });
            navigate({ to: "/commitments" });
          }}
          className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl cta-holo text-base font-extrabold text-primary-foreground disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          สร้างคำมั่นสัญญา
        </button>
        {!action && (
          <p id="cta-hint" className="mx-auto mt-1.5 max-w-xl text-center text-xs text-muted-foreground">
            เลือกสิ่งที่อยากทำด้วยกันก่อน 1 อย่างนะ <span lang="en">· Pick one idea to continue</span>
          </p>
        )}
      </div>
    </div>
  );
}

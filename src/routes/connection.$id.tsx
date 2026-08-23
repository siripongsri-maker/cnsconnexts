import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Chip } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import type { ConnectionStatus } from "@/lib/types";
import { issueTh, powerTh, STATUS_TH, ACTION_TYPES_TH } from "@/lib/i18n";

export const Route = createFileRoute("/connection/$id")({
  head: () => ({
    meta: [
      { title: "จะลุยด้วยกันแบบไหนดี? — คนส. Connect" },
      {
        name: "description",
        content: "แปลงคอนเนกชันใหม่ให้กลายเป็นก้าวต่อไปจริง ๆ ด้วยคำมั่นสัญญาที่ตกลงร่วมกัน",
      },
      { property: "og:title", content: "การ์ดคอนเนกชันของคุณ — คนส. Connect" },
      { property: "og:description", content: "เจอกันแล้ว ทำอะไรต่อดี?" },
    ],
  }),
  component: ConnectionDetail,
  notFoundComponent: () => <p className="p-8 text-center text-sm">ไม่พบคอนเนกชันนี้</p>,
});

function ConnectionDetail() {
  const { id } = Route.useParams();
  const { connections, users, me, addCommitment } = useStore();
  const navigate = useNavigate();

  const conn = connections.find((c) => c.id === id);
  if (!conn) throw notFound();

  const a = users.find((u) => u.id === conn.user_a) ?? me;
  const b = users.find((u) => u.id === conn.user_b);

  const [action, setAction] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("Planning");

  if (!a || !b) throw notFound();

  const sharedIssues = a.interests.filter((i) => b.interests.includes(i));
  const sharedPower = [...new Set([...a.powers_have.slice(0, 1), ...b.powers_have.slice(0, 1)])];

  return (
    <div className="min-h-screen bg-background pb-36">
      <div className="relative overflow-hidden gradient-power px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-primary-foreground">
        <Link
          to="/matches"
          className="tap mb-6 inline-grid h-9 w-9 place-items-center rounded-full bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center justify-center gap-3">
          <Avatar user={a} size={64} />
          <span className="h-0.5 w-8 bg-white/60" />
          <span className="animate-pulse-node h-3 w-3 rounded-full bg-white" />
          <span className="h-0.5 w-8 bg-white/60" />
          <Avatar user={b} size={64} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold uppercase tracking-tight">
          {a.name} × {b.name}
        </h1>
        <p className="mt-1 text-center text-sm opacity-90">แมตช์กัน {conn.match_score}%</p>
      </div>

      <div className="mx-auto max-w-xl space-y-4 px-5 py-5">
        <div className="card-soft p-4">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            พลังที่มีร่วมกัน
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...sharedIssues.map(issueTh), ...sharedPower.map(powerTh)].map((s) => (
              <Chip key={s} tone="primary">
                {s}
              </Chip>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            {conn.match_reason}
          </p>
        </div>

        <div>
          <h2 className="text-xl font-extrabold">จะลุยด้วยกันแบบไหนดี?</h2>
          <p className="text-sm font-semibold text-primary">เราจะทำอะไรร่วมกันได้บ้าง?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACTION_TYPES_TH.map((act) => (
              <button
                key={act}
                onClick={() => setAction(act)}
                className={`tap rounded-full border px-4 py-2.5 text-[13px] font-bold ${
                  action === act
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card"
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            ก้าวต่อไปของเรา
          </p>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="เช่น จัดแคมเปญดิจิทัลเพื่อเยาวชนร่วมกันก่อนสิ้นปีนี้"
            className="w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["Connected", "Planning", "In Progress", "Completed"] as ConnectionStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`tap rounded-full border px-3.5 py-1.5 text-[12px] font-bold ${
                status === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
              }`}
            >
              {STATUS_TH[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <button
          disabled={!action}
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
          className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl gradient-power text-base font-extrabold text-primary-foreground disabled:opacity-40"
        >
          สร้างคำมั่นสัญญา
        </button>
      </div>
    </div>
  );
}

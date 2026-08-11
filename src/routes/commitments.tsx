import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import type { ConnectionStatus } from "@/lib/types";

export const Route = createFileRoute("/commitments")({
  head: () => ({
    meta: [
      { title: "What Happens Next? — Connecting Power" },
      {
        name: "description",
        content: "Your connections and the commitments you made — from planning to completed.",
      },
      { property: "og:title", content: "What Happens Next?" },
      { property: "og:description", content: "รู้จักกันแล้ว แล้วเราจะทำอะไรต่อ?" },
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
  const { connections, commitments, users, me, setConnectionStatus } = useStore();

  const mine = connections.filter((c) => c.user_a === "me" || c.user_b === "me");
  const myCommitments = commitments.filter((m) =>
    mine.some((c) => c.id === m.connection_id),
  );
  const shown = myCommitments.length ? myCommitments : commitments;
  const shownConnections = mine.length ? mine : connections;

  const partnerOf = (connId: string) => {
    const c = connections.find((x) => x.id === connId);
    if (!c) return null;
    const otherId = c.user_a === "me" ? c.user_b : c.user_a;
    return {
      other: users.find((u) => u.id === otherId) ?? null,
      first: users.find((u) => u.id === c.user_a) ?? me,
      conn: c,
    };
  };

  return (
    <AppShell title="What Happens Next?" subtitle="รู้จักกันแล้ว แล้วเราจะทำอะไรต่อ?">
      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <div className="card-soft p-4">
          <p className="text-3xl font-extrabold text-gradient">{shownConnections.length}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            My Connections
          </p>
        </div>
        <div className="card-soft p-4">
          <p className="text-3xl font-extrabold text-gradient">{shown.length}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            My Commitments
          </p>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-6">
        {shown.map((m, idx) => {
          const info = partnerOf(m.connection_id);
          const other = info?.other;
          const first = info?.first;
          return (
            <article
              key={m.id}
              className="card-soft animate-rise p-4"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-2">
                {first && <Avatar user={first} size={34} />}
                {other && <Avatar user={other} size={34} />}
                <p className="min-w-0 flex-1 truncate text-sm font-extrabold uppercase">
                  {(first?.name ?? "You")} + {other?.name ?? "Partner"}
                </p>
              </div>
              <p className="mt-2 text-[15px] font-semibold leading-snug">"{m.description}"</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {m.action_type}
              </p>
              <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => info && setConnectionStatus(info.conn.id, s)}
                    className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                      m.status === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {DOT[s]} {s}
                  </button>
                ))}
              </div>
            </article>
          );
        })}

        <Link
          to="/matches"
          className="tap flex h-14 items-center justify-center rounded-2xl border border-dashed border-primary/50 text-sm font-extrabold text-primary"
        >
          + Make one more connection
        </Link>
      </div>
    </AppShell>
  );
}

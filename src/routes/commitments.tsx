import { useEffect } from "react";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarDays, Check, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MeadowScene } from "@/components/meadow-scene";
import { Avatar } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import type { ConnectionStatus } from "@/lib/types";
import { STATUS_TH } from "@/lib/i18n";

export const Route = createFileRoute("/commitments")({
  head: () => ({
    meta: [
      { title: "คู่ของฉัน — คนส. Connexts" },
      {
        name: "description",
        content: "คนที่เชื่อมกันแล้ว คนที่เก็บไว้ และสิ่งที่ตกลงจะทำด้วยกัน อยู่ในที่เดียว",
      },
      { property: "og:title", content: "คู่ของฉัน — คนส. Connexts" },
      { property: "og:description", content: "รู้จักกันแล้ว แล้วเราจะทำอะไรต่อ?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Commitments,
});

const STATUSES: ConnectionStatus[] = ["Connected", "Planning", "In Progress", "Completed"];

/** ลิงก์ปุ่มรองในแถวการ์ด — สูง ≥ 48px ตัวอักษร 20px */
const ROW_BUTTON = "meadow-btn-secondary tap min-h-12 flex-1 px-3 text-center";

function Commitments() {
  const { connections, commitments, users, me, likedUsers, hydrated, updateCommitment } =
    useStore();
  const hash = useRouterState({ select: (s) => s.location.hash });

  // ลิงก์ /commitments#saved จากสำรับที่ดูครบแล้ว — ส่วนนี้เรนเดอร์หลังโหลดข้อมูล จึงเลื่อนซ้ำเมื่อพร้อม
  useEffect(() => {
    if (hash !== "saved" || !hydrated) return;
    document.getElementById("saved")?.scrollIntoView({ block: "start" });
  }, [hash, hydrated]);

  const mine = connections.filter((c) => c.user_a === "me" || c.user_b === "me");
  const myCommitments = commitments.filter((m) => mine.some((c) => c.id === m.connection_id));
  const saved = likedUsers
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => !!u && u.id !== me?.id);

  const partnerOf = (connId: string) => {
    const c = connections.find((x) => x.id === connId);
    if (!c) return null;
    const isMine = c.user_a === "me" || c.user_b === "me";
    const otherId = c.user_a === "me" ? c.user_b : c.user_a;
    return {
      other: users.find((u) => u.id === otherId) ?? null,
      first: isMine ? me : (users.find((u) => u.id === c.user_a) ?? me),
      isMine,
    };
  };

  return (
    <AppShell title="คู่ของฉัน">
      <div className="flex flex-col gap-10">
        <section aria-labelledby="connected-heading">
          <h2 id="connected-heading" className="font-heading text-title font-semibold text-ink">
            คนที่เชื่อมแล้ว
          </h2>
          {mine.length === 0 ? (
            <div className="meadow-card mt-4 overflow-hidden text-center">
              <MeadowScene variant="empty" className="pointer-events-none" />
              <div className="flex flex-col items-center gap-3 p-6">
                <p className="text-lead text-ink">ยังไม่มีคนที่เชื่อมกัน เริ่มจากการจับคู่ได้เลย</p>
                <Link to="/" className="meadow-btn-primary tap w-full max-w-sm text-center">
                  ไปจับคู่
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {mine.map((c) => {
                const other = partnerOf(c.id)?.other ?? null;
                return (
                  <li key={c.id} className="meadow-card p-4">
                    <div className="flex items-center gap-4">
                      {other ? (
                        <Avatar user={other} size={56} />
                      ) : (
                        <span
                          aria-hidden
                          className="block h-14 w-14 shrink-0 rounded-2xl bg-sky-soft"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 break-words text-lead font-semibold text-ink">
                          {other?.name ?? "คนที่เชื่อมกัน"}
                        </p>
                        <p className="text-body text-ink-soft">{STATUS_TH[c.status]}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Link to="/chat/$id" params={{ id: c.id }} className={ROW_BUTTON}>
                        คุย
                      </Link>
                      <Link to="/connection/$id" params={{ id: c.id }} className={ROW_BUTTON}>
                        ทำอะไรต่อ
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="saved" aria-labelledby="saved-heading" className="scroll-mt-4">
          <h2 id="saved-heading" className="font-heading text-title font-semibold text-ink">
            คนที่เก็บไว้
          </h2>
          {saved.length === 0 ? (
            <p className="meadow-card mt-4 p-5 text-body text-ink-soft">
              ยังไม่มีคนที่เก็บไว้ กด "เก็บไว้" ที่การ์ดของใครก็ได้ แล้วเขาจะมาอยู่ตรงนี้
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {saved.map((u) => (
                <li key={u.id} className="meadow-card p-4">
                  <div className="flex items-center gap-4">
                    <Avatar user={u} size={56} />
                    <p className="line-clamp-2 min-w-0 flex-1 break-words text-lead font-semibold text-ink">
                      {u.name}
                    </p>
                  </div>
                  <Link
                    to="/people/$id"
                    params={{ id: u.id }}
                    className="meadow-btn-secondary tap mt-4 w-full text-center"
                  >
                    ดูโปรไฟล์
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="my-commitments" aria-labelledby="agreed-heading" className="scroll-mt-4">
          <h2 id="agreed-heading" className="font-heading text-title font-semibold text-ink">
            สิ่งที่ตกลงจะทำ
          </h2>
          {myCommitments.length === 0 ? (
            mine.length > 0 ? (
              <Link
                to="/calendar"
                className="meadow-card tap mt-4 flex min-h-12 items-center justify-between gap-3 p-5 text-body font-semibold text-ink"
              >
                <span>ยังไม่มีสิ่งที่ตกลงกัน ชวนกันนัดก้าวแรก</span>
                <span aria-hidden className="text-primary">
                  →
                </span>
              </Link>
            ) : (
              <p className="meadow-card mt-4 p-5 text-body text-ink-soft">
                เมื่อเชื่อมกับใครแล้ว สิ่งที่ตกลงจะทำด้วยกันจะมารวมอยู่ตรงนี้
              </p>
            )
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {myCommitments.map((m) => {
                const info = partnerOf(m.connection_id);
                const other = info?.other;
                const first = info?.first;
                return (
                  <li key={m.id} className="meadow-card p-4">
                    <div className="flex items-center gap-3">
                      {first && <Avatar user={first} size={48} />}
                      {other && <Avatar user={other} size={48} />}
                      <p className="line-clamp-2 min-w-0 flex-1 break-words text-lead font-semibold text-ink">
                        {first?.name ?? "คุณ"} + {other?.name ?? "คนที่เชื่อมกัน"}
                      </p>
                    </div>
                    <p className="mt-3 inline-flex rounded-full bg-sky-soft px-4 py-1 text-body font-semibold text-ink">
                      {STATUS_TH[m.status]}
                    </p>
                    <p className="mt-3 break-words text-body text-ink">“{m.description}”</p>
                    <p className="mt-1 break-words text-body text-ink-soft">{m.action_type}</p>
                    {m.follow_up_date ? (
                      <p className="mt-3 flex items-start gap-2 text-body font-semibold text-primary">
                        <CalendarDays className="mt-1 h-6 w-6 shrink-0" aria-hidden />
                        <span>
                          นัดไว้{" "}
                          {new Date(m.follow_up_date).toLocaleString("th-TH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}{" "}
                          น.
                        </span>
                      </p>
                    ) : null}
                    {info?.isMine && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {!m.follow_up_date && m.status !== "Completed" && (
                          <Link to="/calendar" className={ROW_BUTTON}>
                            <CalendarDays className="h-6 w-6" aria-hidden /> นัดวันลงมือ
                          </Link>
                        )}
                        <Link
                          to="/chat/$id"
                          params={{ id: m.connection_id }}
                          className={ROW_BUTTON}
                        >
                          <MessageCircle className="h-6 w-6" aria-hidden /> คุยต่อ
                        </Link>
                      </div>
                    )}
                    <div
                      role="group"
                      aria-label="เปลี่ยนสถานะ"
                      className="mt-4 grid grid-cols-2 gap-3"
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
                          className={`tap inline-flex min-h-12 items-center justify-center gap-1 rounded-2xl border-2 px-2 text-body font-semibold ${
                            m.status === s
                              ? "border-primary bg-primary text-white"
                              : "border-[#E6E3F2] bg-white text-ink"
                          }`}
                        >
                          {m.status === s && <Check className="h-5 w-5 shrink-0" aria-hidden />}
                          {STATUS_TH[s]}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

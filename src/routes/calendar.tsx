import { useEffect, useId, useMemo, useState } from "react";
import { FollowUpTabs } from "@/components/follow-up-tabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BellRing, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock, Download, MessageCircle, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { REMINDER_STAGES } from "@/components/commitment-reminders";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { commitmentToEvent, downloadICS, googleCalendarUrl } from "@/lib/ical";
import { Avatar } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import { ACTION_TYPES_TH, STATUS_TH } from "@/lib/i18n";
import type { Commitment, ConnectionStatus, User } from "@/lib/types";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "ปฏิทินนัดหมาย — คนส. Connexts" },
      {
        name: "description",
        content: "เสนอวันเวลาสำหรับคำมั่นสัญญาของแต่ละคอนเนกชัน และติดตามสถานะการลงมือทำ",
      },
      { property: "og:title", content: "ปฏิทินนัดหมาย — คนส. Connexts" },
      {
        property: "og:description",
        content: "นัดวันเวลา ติดตามสถานะ ทำให้คำมั่นสัญญาเกิดขึ้นจริง",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

const STATUSES: ConnectionStatus[] = ["Connected", "Planning", "In Progress", "Completed"];
const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const timeTh = (iso: string) =>
  new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

function CalendarPage() {
  const { connections, commitments, users, addCommitment, updateCommitment, sendMessage } = useStore();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  const mine = connections.filter((c) => c.user_a === "me" || c.user_b === "me");
  const shownConnections = mine;
  const connIds = new Set(shownConnections.map((c) => c.id));
  const shown = commitments.filter((m) => connIds.has(m.connection_id));

  const partnerOf = (connectionId: string) => {
    const c = connections.find((x) => x.id === connectionId);
    if (!c) return null;
    const otherId = c.user_a === "me" ? c.user_b : c.user_a;
    return users.find((u) => u.id === otherId) ?? null;
  };

  const byDay = useMemo(() => {
    const map = new Map<string, Commitment[]>();
    for (const m of shown) {
      if (!m.follow_up_date) continue;
      const d = new Date(m.follow_up_date);
      if (Number.isNaN(d.getTime())) continue;
      const k = dayKey(d);
      map.set(k, [...(map.get(k) ?? []), m]);
    }
    for (const list of map.values())
      list.sort((a, b) => (a.follow_up_date! < b.follow_up_date! ? -1 : 1));
    return map;
  }, [shown]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const unscheduled = shown.filter((m) => !m.follow_up_date);
  const selectedList = byDay.get(selected) ?? [];
  const todayKey = dayKey(new Date());

  const noCommitment = shownConnections.filter(
    (c) => !shown.some((m) => m.connection_id === c.id),
  );

  return (
    <AppShell title="จะทำอะไรต่อดี?" subtitle="ก้าวต่อไปของเรา">
      <FollowUpTabs />
      <div className="space-y-4 px-5 py-4">
        <button
          type="button"
          onClick={() => {
            const events = shown
              .map((m) => commitmentToEvent(m, partnerOf(m.connection_id)?.name))
              .filter((e): e is NonNullable<typeof e> => Boolean(e));
            if (events.length === 0) {
              toast.error("ยังไม่มีนัดที่ระบุวันเวลา");
              return;
            }
            downloadICS("นัดของฉัน", events);
            toast.success(`บันทึก ${events.length} นัดของคุณแล้ว`, {
              description: "เปิดไฟล์ .ics เพื่อบันทึกลงปฏิทินของคุณ",
            });
          }}
          className="tap flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-xs font-extrabold text-foreground"
        >
          <Download className="h-4 w-4 text-primary" aria-hidden /> บันทึกนัดของฉันลงปฏิทิน (.ics)
        </button>

        <div className="card-soft p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="เดือนก่อนหน้า"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="tap inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <p className="text-sm font-extrabold">
              {MONTHS_TH[month]} {year + 543}
            </p>
            <button
              type="button"
              aria-label="เดือนถัดไป"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="tap inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
            {DOW.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={`e-${i}`} />;
              const k = dayKey(d);
              const count = byDay.get(k)?.length ?? 0;
              const isSel = k === selected;
              return (
                <button
                  key={k}
                  type="button"
                  aria-label={`${d.getDate()} ${MONTHS_TH[month]}${count ? ` · มีนัด ${count} รายการ` : ""}`}
                  aria-pressed={isSel}
                  aria-current={k === todayKey ? "date" : undefined}
                  onClick={() => setSelected(k)}
                  className={`tap flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold ${
                    isSel
                      ? "bg-primary text-primary-foreground"
                      : k === todayKey
                        ? "bg-accent ring-1 ring-primary/40"
                        : "bg-accent/60"
                  }`}
                >
                  {d.getDate()}
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                      count ? (isSel ? "bg-primary-foreground" : "bg-primary") : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <section className="card-soft p-4">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            นัดหมายวันที่{" "}
            {(() => {
              const [y = 0, mo = 1, da = 1] = selected.split("-").map(Number);
              return new Date(y, mo - 1, da).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
            })()}
          </h2>
          {selectedList.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">ยังไม่มีนัดในวันที่เลือก ลองแตะวันอื่น หรือเสนอเวลาใหม่ด้านล่างได้เลย</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {selectedList.map((m) => (
                <li key={m.id}>
                  <CommitmentRow
                    m={m}
                    partner={partnerOf(m.connection_id)}
                    onUpdate={updateCommitment}
                    onSend={sendMessage}
                    onScheduled={(iso) => setSelected(dayKey(new Date(iso)))}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {unscheduled.length > 0 && (
          <section className="card-soft p-4">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              รอเสนอวันเวลา ({unscheduled.length})
            </h2>
            <ul className="mt-3 space-y-3">
              {unscheduled.map((m) => (
                <li key={m.id}>
                  <CommitmentRow
                    m={m}
                    partner={partnerOf(m.connection_id)}
                    onUpdate={updateCommitment}
                    onSend={sendMessage}
                    onScheduled={(iso) => setSelected(dayKey(new Date(iso)))}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {noCommitment.length > 0 && (
          <section className="card-soft p-4">
            <h2 className="text-sm font-extrabold">คอนเนกชันที่ยังไม่มีก้าวต่อไป</h2>
            <ul className="mt-3 space-y-3">
              {noCommitment.map((c) => (
                <li key={c.id}>
                  <NewCommitmentRow
                    connectionId={c.id}
                    partner={partnerOf(c.id)}
                    onCreate={addCommitment}
                    onCreated={(iso) => setSelected(dayKey(new Date(iso)))}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {mine.length === 0 && <NoConnectionsCard />}
      </div>
    </AppShell>
  );
}

function NoConnectionsCard() {
  return (
    <div className="card-soft p-5 text-center">
      <h2 className="text-lg font-extrabold">ยังไม่มีคอนเนกชันเลย</h2>
      <p lang="en" className="text-xs text-muted-foreground">
        No connections yet
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        เริ่มจากทักคนที่พลังเสริมกับเราสักคน แล้วค่อยชวนกันคิดว่าจะทำอะไรด้วยกัน
      </p>
      <Link
        to="/matches"
        className="tap mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-extrabold text-primary-foreground"
      >
        ไปหาคนที่น่าเจอ
      </Link>
    </div>
  );
}

function PartnerHead({
  partner,
  label,
}: {
  partner: User | null;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar
        user={{
          name: partner?.name ?? "?",
          avatar: partner?.avatar ?? "🙂",
          photo: partner?.photo ?? undefined,
        }}
        size={32}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{partner?.name ?? "คอนเนกชัน"}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CommitmentRow({
  m,
  partner,
  onUpdate,
  onSend,
  onScheduled,
}: {
  m: Commitment;
  partner: User | null;
  onUpdate: ReturnType<typeof useStore>["updateCommitment"];
  onSend: ReturnType<typeof useStore>["sendMessage"];
  onScheduled?: (iso: string) => void;
}) {
  const [when, setWhen] = useState(() => toLocalInput(m.follow_up_date));
  return (
    <div className="rounded-2xl bg-accent/50 p-3">
      <PartnerHead partner={partner} label={m.action_type} />
      {m.follow_up_date && (
        <>
          <p className="mt-2 text-xs font-semibold text-primary">
            นัดไว้ {new Date(m.follow_up_date).toLocaleDateString("th-TH", { dateStyle: "medium" })} ·{" "}
            {timeTh(m.follow_up_date)} น.
          </p>
          <ReminderChip iso={m.follow_up_date} done={m.status === "Completed"} />
          <RsvpButtons m={m} />
        </>
      )}
      <div className="mt-2 flex gap-2">
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          aria-label={`เลือกวันเวลานัดกับ ${partner?.name ?? "คอนเนกชัน"}`}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-2 py-2 text-base"
        />
        <button
          type="button"
          disabled={!when}
          onClick={() => {
            const iso = new Date(when).toISOString();
            onUpdate(m.id, { follow_up_date: iso });
            onScheduled?.(iso);
            toast.success("เสนอเวลาแล้ว", {
              description: `กด “ส่งเข้าห้องแชท” ให้ ${partner?.name ?? "อีกฝ่าย"} ตอบรับได้เลย`,
            });
          }}
          className="tap min-h-11 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          เสนอเวลา
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={m.status === s}
            onClick={() => {
              if (m.status === s) return;
              onUpdate(m.id, { status: s });
              toast.success(`อัปเดตเป็น “${STATUS_TH[s]}” แล้ว`);
            }}
            className={`tap inline-flex min-h-11 items-center rounded-full px-3 text-xs font-bold ${
              m.status === s
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground"
            }`}
          >
            {STATUS_TH[s]}
          </button>
        ))}
        <Link
          to="/connection/$id"
          params={{ id: m.connection_id }}
          className="tap ml-auto inline-flex min-h-11 items-center rounded-full bg-background px-3 text-xs font-bold text-primary"
        >
          เปิดคอนเนกชัน
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const whenText = m.follow_up_date
              ? new Date(m.follow_up_date).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }) + " น."
              : "ยังไม่ระบุวันเวลา";
            onSend(
              m.connection_id,
              `📅 นัดหมาย: ${m.action_type}\n${m.description}\nเวลา: ${whenText}`,
            );
            toast.success("ส่งการนัดหมายเข้าห้องแชทแล้ว", {
              description: partner?.name ?? undefined,
            });
          }}
          className="tap inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground"
        >
          <Send className="h-3 w-3" aria-hidden /> ส่งเข้าห้องแชท
        </button>
        <Link
          to="/chat/$id"
          params={{ id: m.connection_id }}
          className="tap inline-flex min-h-11 items-center gap-1 rounded-full bg-background px-3 text-xs font-bold text-primary"
        >
          <MessageCircle className="h-3 w-3" aria-hidden /> เปิดแชท
        </Link>
        {m.follow_up_date && (
          <>
            <button
              type="button"
              onClick={() => {
                const ev = commitmentToEvent(m, partner?.name);
                if (ev) downloadICS("นัดหมาย", [ev]);
              }}
              className="tap inline-flex min-h-11 items-center gap-1 rounded-full bg-background px-3 text-xs font-bold text-foreground"
            >
              <Download className="h-3 w-3" aria-hidden /> .ics
            </button>
            <a
              href={(() => {
                const ev = commitmentToEvent(m, partner?.name);
                return ev ? googleCalendarUrl(ev) : "#";
              })()}
              target="_blank"
              rel="noreferrer"
              className="tap inline-flex min-h-11 items-center gap-1 rounded-full bg-background px-3 text-xs font-bold text-foreground"
            >
              <CalendarPlus className="h-3 w-3" aria-hidden /> Google
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function NewCommitmentRow({
  connectionId,
  partner,
  onCreate,
  onCreated,
}: {
  connectionId: string;
  partner: User | null;
  onCreate: ReturnType<typeof useStore>["addCommitment"];
  onCreated: (iso: string) => void;
}) {
  const [action, setAction] = useState<string>(ACTION_TYPES_TH[0] ?? "นัดเจอกันอีกครั้ง");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const selId = useId();
  const noteId = useId();
  return (
    <div className="rounded-2xl bg-accent/50 p-3">
      <PartnerHead partner={partner} label="ยังไม่มีก้าวต่อไป" />
      <div className="mt-2 space-y-2">
        <label htmlFor={selId} className="block text-xs font-bold">
          อยากทำอะไรด้วยกัน
        </label>
        <select
          id={selId}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-2 py-2 text-base"
        >
          {ACTION_TYPES_TH.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <label htmlFor={noteId} className="block text-xs font-bold">
          เล่าเพิ่มอีกนิด (ไม่ใส่ก็ได้)
        </label>
        <input
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น ลองทำแคมเปญออนไลน์ให้เยาวชนด้วยกัน"
          className="min-h-11 w-full rounded-xl border border-border bg-background px-2 py-2 text-base"
        />
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-label="เลือกวันเวลาที่สะดวก"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-2 py-2 text-base"
          />
          <button
            type="button"
            disabled={!when}
            onClick={() => {
              const iso = new Date(when).toISOString();
              onCreate({
                connection_id: connectionId,
                action_type: action,
                description: note.trim() || `${action} กับ ${partner?.name ?? "เพื่อนใหม่"}`,
                status: "Planning",
                follow_up_date: iso,
              });
              onCreated(iso);
              setWhen("");
              setNote("");
              toast.success("เสนอนัดแล้ว", { description: partner?.name ?? undefined });
            }}
            className="tap min-h-11 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            เสนอนัด
          </button>
        </div>
      </div>
    </div>
  );
}

/** ป้ายนับถอยหลังถึงนัด + ช่วงเตือนถัดไป (อัปเดตทุก 30 วินาที) */
function ReminderChip({ iso, done }: { iso: string; done: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (done) return null;
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return null;
  const diff = due - now;

  if (diff <= 0) {
    return (
      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
        <BellRing className="h-3 w-3" aria-hidden /> ถึงเวลานัดแล้ว
      </p>
    );
  }

  const mins = Math.floor(diff / 60000);
  const left =
    mins < 60
      ? `อีก ${mins} นาที`
      : mins < 1440
        ? `อีก ${Math.floor(mins / 60)} ชั่วโมง`
        : `อีก ${Math.floor(mins / 1440)} วัน`;
  const next = REMINDER_STAGES.filter((s) => s.ms < diff).slice(-1)[0];

  return (
    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
      <BellRing className="h-3 w-3" aria-hidden /> {left}
      {next ? ` · เตือน${next.label}` : " · เตือนแล้ว"}
    </p>
  );
}

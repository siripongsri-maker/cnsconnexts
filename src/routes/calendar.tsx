import { useEffect, useId, useMemo, useState } from "react";
import { FollowUpTabs } from "@/components/follow-up-tabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MessageCircle,
  Send,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChoicePill } from "@/components/choice-pill";
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
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
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
  const { connections, commitments, users, addCommitment, updateCommitment, sendMessage } =
    useStore();
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

  const noCommitment = shownConnections.filter((c) => !shown.some((m) => m.connection_id === c.id));

  return (
    <AppShell title="ปฏิทินนัดหมาย" subtitle="กำหนดวัน แล้วเริ่มลงมือด้วยกัน">
      <div className="space-y-5 pb-8">
        <FollowUpTabs />

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
          className="meadow-btn-secondary w-full"
        >
          <Download className="h-6 w-6 shrink-0" aria-hidden="true" /> บันทึกนัดลงปฏิทิน (.ics)
        </button>

        <section className="meadow-card px-0.5 pb-3 pt-3" aria-label="ปฏิทิน">
          <div className="mb-2 flex items-center justify-between gap-2 px-3">
            <button
              type="button"
              aria-label="เดือนก่อนหน้า"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="tap inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-soft text-ink"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <p className="min-w-0 text-center font-heading text-lead font-semibold text-ink">
              {MONTHS_TH[month]} {year + 543}
            </p>
            <button
              type="button"
              aria-label="เดือนถัดไป"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="tap inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-soft text-ink"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-body font-semibold text-ink-soft">
            {DOW.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              if (!d) return <span key={`e-${i}`} />;
              const k = dayKey(d);
              const count = byDay.get(k)?.length ?? 0;
              const isSel = k === selected;
              const isToday = k === todayKey;
              return (
                <button
                  key={k}
                  type="button"
                  aria-label={`${d.getDate()} ${MONTHS_TH[month]}${count ? ` · มีนัด ${count} รายการ` : ""}`}
                  aria-pressed={isSel}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => setSelected(k)}
                  className="tap h-12 w-full p-0.5"
                >
                  <span
                    className={`flex h-full w-full flex-col items-center justify-center rounded-xl text-body leading-none font-semibold ${
                      isSel
                        ? "bg-primary text-white"
                        : isToday
                          ? "bg-sky-soft text-ink ring-2 ring-primary"
                          : "text-ink"
                    }`}
                  >
                    {d.getDate()}
                    <span
                      aria-hidden="true"
                      className={`mt-1 h-2 w-2 rounded-full ${
                        count ? (isSel ? "bg-white" : "bg-primary") : "bg-transparent"
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="meadow-card p-5">
          <h2 className="flex items-start gap-3 font-heading text-title font-semibold! text-ink">
            <CalendarDays className="mt-1 h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0">
              นัดหมายวันที่{" "}
              {(() => {
                const [y = 0, mo = 1, da = 1] = selected.split("-").map(Number);
                return new Date(y, mo - 1, da).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
              })()}
            </span>
          </h2>
          {selectedList.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-sky-soft p-5 text-center">
              <CalendarPlus className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
              <h3 className="mt-2 font-heading text-lead font-semibold text-ink">
                วันนี้ยังว่างอยู่
              </h3>
              <p className="mt-1 text-body text-ink-soft">เลือกวันอื่น หรือเสนอเวลาใหม่ด้านล่าง</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
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
          <section className="meadow-card p-5">
            <h2 className="flex items-start gap-3 font-heading text-title font-semibold! text-ink">
              <Clock className="mt-1 h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0">รอเสนอวันเวลา ({unscheduled.length})</span>
            </h2>
            <ul className="mt-4 space-y-4">
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
          <section className="meadow-card p-5">
            <h2 className="font-heading text-title font-semibold! text-ink">
              คอนเนกชันที่ยังไม่มีก้าวต่อไป
            </h2>
            <ul className="mt-4 space-y-4">
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
    <section className="meadow-card p-6 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sky-soft text-primary"
      >
        <CalendarDays className="h-8 w-8" />
      </span>
      <h2 className="mt-4 font-heading text-title font-semibold! text-ink">ยังไม่มีคอนเนกชันเลย</h2>
      <p className="mt-2 text-body text-ink-soft">เจอคนที่พลังเสริมกัน แล้วชวนวางแผนร่วมทำ</p>
      <Link to="/" className="meadow-btn-primary mt-5 w-full">
        ไปหาคนที่น่าเจอ
      </Link>
    </section>
  );
}

function PartnerHead({ partner, label }: { partner: User | null; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar
        user={{
          name: partner?.name ?? "?",
          avatar: partner?.avatar ?? "🙂",
          photo: partner?.photo ?? undefined,
        }}
        size={48}
      />
      <div className="min-w-0">
        <p className="line-clamp-2 text-body font-semibold break-words text-ink">
          {partner?.name ?? "คอนเนกชัน"}
        </p>
        <p className="line-clamp-2 text-body break-words text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

/** ลิงก์/ปุ่มรองแบบเม็ดยา — ตัวอักษร 20px สูง ≥ 48px */
const PILL =
  "tap inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink bg-white px-4 py-1 text-body font-semibold text-ink";
const PILL_PRIMARY =
  "tap inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-primary bg-primary px-4 py-1 text-body font-semibold text-white";

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
  const whenId = useId();
  return (
    <div className="rounded-2xl bg-sky-soft p-4">
      <PartnerHead partner={partner} label={m.action_type} />
      {m.follow_up_date && (
        <>
          <p className="mt-3 text-body font-semibold text-primary">
            นัดไว้ {new Date(m.follow_up_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}{" "}
            · {timeTh(m.follow_up_date)} น.
          </p>
          <ReminderChip iso={m.follow_up_date} done={m.status === "Completed"} />
          <RsvpButtons m={m} />
        </>
      )}
      <div className="mt-4 space-y-2">
        <label htmlFor={whenId} className="block text-body font-semibold text-ink">
          เลือกวันเวลานัดกับ {partner?.name ?? "คอนเนกชัน"}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={whenId}
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full min-w-0 rounded-xl border-2 bg-white px-3 text-body text-ink sm:flex-1"
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
            className="meadow-btn-primary w-full sm:w-auto"
          >
            เสนอเวลา
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <ChoicePill
            key={s}
            active={m.status === s}
            onClick={() => {
              if (m.status === s) return;
              onUpdate(m.id, { status: s });
              toast.success(`อัปเดตเป็น “${STATUS_TH[s]}” แล้ว`);
            }}
          >
            {STATUS_TH[s]}
          </ChoicePill>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
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
          className={PILL_PRIMARY}
        >
          <Send className="h-5 w-5 shrink-0" aria-hidden="true" /> ส่งเข้าห้องแชท
        </button>
        <Link to="/chat/$id" params={{ id: m.connection_id }} className={PILL}>
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> เปิดแชท
        </Link>
        <Link to="/connection/$id" params={{ id: m.connection_id }} className={PILL}>
          เปิดคอนเนกชัน
        </Link>
        {m.follow_up_date && (
          <>
            <button
              type="button"
              onClick={() => {
                const ev = commitmentToEvent(m, partner?.name);
                if (ev) downloadICS("นัดหมาย", [ev]);
              }}
              className={PILL}
            >
              <Download className="h-5 w-5 shrink-0" aria-hidden="true" /> .ics
            </button>
            <a
              href={(() => {
                const ev = commitmentToEvent(m, partner?.name);
                return ev ? googleCalendarUrl(ev) : "#";
              })()}
              target="_blank"
              rel="noreferrer"
              className={PILL}
            >
              <CalendarPlus className="h-5 w-5 shrink-0" aria-hidden="true" /> Google
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
  const whenId = useId();
  return (
    <div className="rounded-2xl bg-sky-soft p-4">
      <PartnerHead partner={partner} label="ยังไม่มีก้าวต่อไป" />
      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          <label htmlFor={selId} className="block text-body font-semibold text-ink">
            อยากทำอะไรด้วยกัน
          </label>
          <select
            id={selId}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-xl border-2 bg-white px-3 text-body text-ink"
          >
            {ACTION_TYPES_TH.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor={noteId} className="block text-body font-semibold text-ink">
            เล่าเพิ่มอีกนิด (ไม่ใส่ก็ได้)
          </label>
          <input
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น ลองทำแคมเปญออนไลน์ให้เยาวชนด้วยกัน"
            className="w-full rounded-xl border-2 bg-white px-3 text-body text-ink"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={whenId} className="block text-body font-semibold text-ink">
            เลือกวันเวลาที่สะดวก
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={whenId}
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full min-w-0 rounded-xl border-2 bg-white px-3 text-body text-ink sm:flex-1"
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
              className="meadow-btn-primary w-full sm:w-auto"
            >
              เสนอนัด
            </button>
          </div>
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
      <p className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#B3261E] px-3 py-1 text-body font-semibold text-white">
        <BellRing className="h-5 w-5 shrink-0" aria-hidden="true" /> ถึงเวลานัดแล้ว
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
    <p className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-1 text-body font-semibold text-primary">
      <BellRing className="h-5 w-5 shrink-0" aria-hidden="true" /> {left}
      {next ? ` · เตือน${next.label}` : " · เตือนแล้ว"}
    </p>
  );
}

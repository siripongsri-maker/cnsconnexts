import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import { Avatar } from "@/components/power-bits";
import { useStore } from "@/lib/store";

const QUICK = [
  "สวัสดี ดีใจที่ได้เชื่อมกันนะ",
  "ว่างคุยสั้น ๆ สัก 15 นาทีไหม",
  "เจอกันที่โซนเครือข่ายสะดวกไหม",
  "ขอดูข้อมูลโครงการเพิ่มหน่อยได้ไหม",
];

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

/** ห้องแชทสั้นแบบเรียลไทม์ของคู่เชื่อมต่อ */
export function ChatRoom({
  connectionId,
  compact = false,
  hideHeader = false,
}: {
  connectionId: string;
  compact?: boolean;
  hideHeader?: boolean;
}) {
  const { messages, connections, users, me, sendMessage, markRoomRead } = useStore();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const conn = connections.find((c) => c.id === connectionId);
  const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
  const other = users.find((u) => u.id === otherId);

  const thread = useMemo(
    () => messages.filter((m) => m.connection_id === connectionId),
    [messages, connectionId],
  );

  useEffect(() => {
    markRoomRead(connectionId);
  }, [connectionId, markRoomRead, thread.length]);

  useEffect(() => {
    // เลื่อนเฉพาะกล่องข้อความ ไม่ดึงทั้งหน้า และไม่ดึงถ้าคนกำลังเลื่อนอ่านข้อความเก่าอยู่
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [thread.length]);

  const send = (value: string) => {
    if (!value.trim()) return;
    stickRef.current = true;
    sendMessage(connectionId, value);
    setText("");
  };

  return (
    <div className="card-soft rounded-3xl bg-card p-4">
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/12 text-primary">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-extrabold">
              แชทกับ {other?.name ?? "เพื่อนร่วมงาน"}
            </h2>
            <p className="text-xs text-muted-foreground">คุยสั้น ๆ แล้วนัดหมายการลงมือทำ</p>
          </div>
        </div>
      )}

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        role="log"
        aria-live="polite"
        tabIndex={0}
        aria-label={`ข้อความกับ ${other?.name ?? "เพื่อนร่วมงาน"}`}
        className={`${hideHeader ? "" : "mt-3"} space-y-2 overflow-y-auto pr-1 ${compact ? "max-h-64" : "max-h-[52vh]"}`}
      >
        {thread.length === 0 && (
          <p className="rounded-2xl bg-muted/60 px-4 py-3 text-[12.5px] text-muted-foreground">
            เริ่มบทสนทนาแรกได้เลย — ทักทาย เล่าสิ่งที่อยากทำร่วมกัน แล้วนัดเวลาคุยต่อ
          </p>
        )}
        {thread.map((m) => {
          const mine = m.from_id === "me";
          const author = mine ? me : other;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
              {!mine && author && <Avatar user={author} size={28} />}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`mt-1 text-xs ${mine ? "opacity-90" : "text-muted-foreground"}`}>
                  {clock(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setText(q);
              inputRef.current?.focus();
            }}
            className="tap inline-flex min-h-11 items-center rounded-full border border-border bg-background px-3.5 text-xs font-bold"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="พิมพ์ข้อความ…"
          aria-label="ข้อความ"
          className="h-12 flex-1 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="ส่งข้อความ"
          className="tap grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
